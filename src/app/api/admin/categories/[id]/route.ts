import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error("Unauthorized");
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) throw new Error("Forbidden: Not an admin");
}

// PUT: Update a category
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyAdmin(request);
    const categoryId = params.id;
    const updateData = await request.json();
    const categoryRef = adminDb.collection('categories').doc(categoryId);
    
    // **Fix: Use .update() and FieldValue.serverTimestamp()**
    await categoryRef.update({ 
      ...updateData, 
      updatedAt: FieldValue.serverTimestamp() 
    });
    
    return NextResponse.json({ success: true, message: 'Category updated' });
  } catch (error: any) {
    console.error("Admin Update Category API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a category
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyAdmin(request);
    const categoryId = params.id;
    const categoryRef = adminDb.collection('categories').doc(categoryId);
    
    // **Fix: Use .delete()**
    await categoryRef.delete();
    
    // Note: You should also delete the image from Firebase Storage here in a real application
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    console.error("Admin Delete Category API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}