import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Product, ProductImage } from '@/hooks/useProducts';

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

export async function POST(request: NextRequest) {
  try {
    const adminUid = await verifyAdmin(request);
    const formData = await request.formData();
    const productData = JSON.parse(formData.get('productData') as string);
    const imageFiles = formData.getAll('images') as File[];

    const newProductRef = adminDb.collection('products').doc();
    const productId = newProductRef.id;

    // Upload images and get their URLs
    const imageUrls: ProductImage[] = await Promise.all(
      imageFiles.map(async (file, index) => {
        // Corrected usage: adminStorage is now the bucket itself
        const imageRef = adminStorage.file(`products/${productId}/${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await imageRef.save(buffer, {
          metadata: { contentType: file.type },
        });
        const [url] = await imageRef.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        return {
          imageUrl: url,
          altText: productData.nameAr || 'Product image',
          sortOrder: index,
          isPrimary: index === 0,
        };
      })
    );
    
    // Prepare the product document
    const newProduct: Omit<Product, 'id'> = {
      ...productData,
      images: imageUrls,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid,
    };

    // Save the product to Firestore
    await newProductRef.set(newProduct);

    return NextResponse.json({ success: true, productId: newProductRef.id });

  } catch (error: any) {
    console.error('Error adding product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
