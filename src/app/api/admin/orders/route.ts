import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from "@/lib/firebase-admin";
export const dynamic = 'force-dynamic';

// Helper function to verify that the user is an admin
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    throw new Error("Forbidden: Not an admin");
  }
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // **Major Fix: Define the variable with the correct type**
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection('orders');
    
    // Apply status filter if it exists
    if (status && status !== 'all') {
        query = query.where('status', '==', status.toUpperCase());
    }
    
    // Always apply ordering
    query = query.orderBy('createdAt', 'desc');
    
    const querySnapshot = await query.get();
    
    const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate().toISOString(),
        updatedAt: doc.data().updatedAt.toDate().toISOString(),
    }));

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("Admin Get Orders API Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Unauthorized") || error.message.includes("Forbidden") ? 401 : 500 }
    );
  }
}
