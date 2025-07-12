import { NextRequest, NextResponse } from 'next/server';
// **Major Fix: Import FieldValue from our setup file**
import { adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, message, conversationId } = await request.json();

    if (!userId || !message) {
      return NextResponse.json({ error: "User ID and message are required" }, { status: 400 });
    }

    let currentConversationId = conversationId;

    // If there is no conversation, create a new one
    if (!currentConversationId) {
      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      const conversationData = {
        userId: userId,
        userName: userDoc.exists ? userDoc.data()?.fullName : 'Visitor',
        userEmail: userDoc.exists ? userDoc.data()?.email : 'Not registered',
        lastMessage: message,
        lastMessageAt: FieldValue.serverTimestamp(),
        isReadByAdmin: false,
      };
      // **Fix: Use .add() to create a new document**
      const conversationRef = await adminDb.collection('conversations').add(conversationData);
      currentConversationId = conversationRef.id;
    }

    // Add the message to the conversation
    const messageRef = adminDb.collection('conversations').doc(currentConversationId).collection('messages');
    await messageRef.add({
      senderId: userId,
      text: message,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Update the last message in the conversation
    await adminDb.collection('conversations').doc(currentConversationId).update({
      lastMessage: message,
      lastMessageAt: FieldValue.serverTimestamp(),
      isReadByAdmin: false,
    });

    return NextResponse.json({ success: true, conversationId: currentConversationId });

  } catch (error: any) {
    console.error("Send Message API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}