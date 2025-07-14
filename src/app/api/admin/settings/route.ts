import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin';

// Helper function to verify that the user is an admin
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    throw new Error('Forbidden: Not an admin');
  }
  return decodedToken.uid;
}

// POST /api/admin/settings - Updates the general site settings
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const settingsData = await request.json();

    if (!settingsData) {
      return NextResponse.json({ error: "Settings data is required" }, { status: 400 });
    }

    const settingsRef = adminDb.collection('settings').doc('general');

    await settingsRef.set(
      {
        ...settingsData,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true } // Use merge to avoid overwriting the entire document
    );

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error: any) {
    console.error("Update Settings API Error:", error.message);
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
