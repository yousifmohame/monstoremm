import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Helper function to verify the user's token and get their UID
async function getUserIdFromToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  return decodedToken.uid;
}

// POST /api/auth/delete - Deletes the authenticated user's account
export async function POST(request: NextRequest) {
  try {
    const uid = await getUserIdFromToken(request);

    // Use a transaction to ensure both operations succeed or fail together
    await adminDb.runTransaction(async (transaction) => {
      const userDocRef = adminDb.collection('users').doc(uid);
      transaction.delete(userDocRef);
    });

    // Delete the user from Firebase Authentication
    await adminAuth.deleteUser(uid);

    const response = NextResponse.json({ success: true, message: 'Account deleted successfully' });
    
    // Clear the authentication cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire the cookie immediately
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Delete Account API Error:', error);
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 });
  }
}
