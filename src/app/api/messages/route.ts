import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, message, conversationId } = await request.json();

    if (!userId || !message) {
      return NextResponse.json({ error: "User ID and message are required" }, { status: 400 });
    }

    let currentConversationId = conversationId;
    let userName = 'زائر';

    if (!currentConversationId) {
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        userName = userDoc.data()?.fullName || userName;
      }
      
      const conversationData = {
        userId: userId,
        userName: userName,
        userEmail: userDoc.exists ? userDoc.data()?.email : 'غير مسجل',
        lastMessage: message,
        lastMessageAt: FieldValue.serverTimestamp(),
        isReadByAdmin: false,
      };
      const conversationRef = await adminDb.collection('conversations').add(conversationData);
      currentConversationId = conversationRef.id;
    } else {
        const convoDoc = await adminDb.collection('conversations').doc(currentConversationId).get();
        if (convoDoc.exists) {
            userName = convoDoc.data()?.userName || userName;
        }
    }

    const messageRef = adminDb.collection('conversations').doc(currentConversationId).collection('messages');
    await messageRef.add({
      senderId: userId,
      text: message,
      timestamp: FieldValue.serverTimestamp(),
    });

    await adminDb.collection('conversations').doc(currentConversationId).update({
      lastMessage: message,
      lastMessageAt: FieldValue.serverTimestamp(),
      isReadByAdmin: false,
    });

    // **الإضافة الجديدة: إنشاء إشعار للمدير**
    const notificationRef = adminDb.collection("notifications").doc();
    await notificationRef.set({
        type: 'NEW_MESSAGE',
        message: `رسالة جديدة من ${userName}: "${message.substring(0, 30)}..."`,
        link: `/admin/messages`, // رابط لصفحة الرسائل
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, conversationId: currentConversationId });

  } catch (error: any) {
    console.error("Send Message API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
