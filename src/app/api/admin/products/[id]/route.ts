import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ProductImage } from '@/hooks/useProducts';

// Helper function to verify admin user
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Forbidden: Not an admin');
    }
    return decodedToken.uid;
  } catch (error) {
    console.error('Admin verification error:', error);
    throw new Error('Unauthorized: Invalid token');
  }
}

// GET a single product by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyAdmin(request);
    const productRef = adminDb.collection('products').doc(params.id);
    const docSnap = await productRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const productData = docSnap.data();
    return NextResponse.json({ 
      id: docSnap.id, 
      ...productData,
      createdAt: productData?.createdAt?.toDate().toISOString(),
      updatedAt: productData?.updatedAt?.toDate().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
}

// UPDATE a product by ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const adminUid = await verifyAdmin(request);
    const productId = params.id;
    const formData = await request.formData();

    const productData = JSON.parse(formData.get('productData') as string);
    const imagesToDelete = JSON.parse(formData.get('imagesToDelete') as string || '[]') as string[];
    const newImageFiles = formData.getAll('newImages') as File[];

    const productRef = adminDb.collection('products').doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const currentImages = productDoc.data()?.images || [];

    // 1. Delete old images from Storage
    if (imagesToDelete.length > 0) {
      await Promise.all(imagesToDelete.map(async (url) => {
        if (typeof url === 'string' && url.includes('firebasestorage.googleapis.com')) {
            try {
              const path = new URL(url).pathname.split('/o/')[1].split('?')[0];
              await adminStorage.file(decodeURIComponent(path)).delete();
            } catch (e) {
              console.error(`Failed to delete image ${url}:`, e);
            }
        }
      }));
    }

    // 2. Upload new images
    const uploadedUrls: ProductImage[] = await Promise.all(
      newImageFiles.map(async (file, index) => {
        const imageRef = adminStorage.file(`products/${productId}/${Date.now()}-${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await imageRef.save(buffer, { metadata: { contentType: file.type } });
        await imageRef.makePublic();
        return {
          imageUrl: imageRef.publicUrl(),
          altText: productData.nameAr || 'Product image',
          sortOrder: currentImages.length + index,
          isPrimary: false,
        };
      })
    );

    // 3. Combine old and new images for Firestore
    let finalImages: ProductImage[] = currentImages.filter((img: ProductImage) => !imagesToDelete.includes(img.imageUrl));
    finalImages = [...finalImages, ...uploadedUrls];
    
    // **THE FIX IS HERE**: Explicitly type the 'img' parameter
    finalImages.forEach((img: ProductImage, index) => {
        img.sortOrder = index;
        img.isPrimary = index === 0;
    });

    // 4. Update Firestore document
    const dataToUpdate = {
      ...productData,
      images: finalImages,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    };
    
    await productRef.update(dataToUpdate);

    return NextResponse.json({ success: true, message: 'Product updated successfully' });

  } catch (error: any) {
    console.error('Update Product API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a product by ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await verifyAdmin(request);
        const productId = params.id;
        const productRef = adminDb.collection('products').doc(productId);
        
        const docSnap = await productRef.get();
        if (!docSnap.exists) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
    
        const productData = docSnap.data();
        if (productData?.images && Array.isArray(productData.images)) {
            for (const image of productData.images) {
                if (typeof image.imageUrl === 'string' && image.imageUrl.includes('firebasestorage.googleapis.com')) {
                    try {
                        const path = new URL(image.imageUrl).pathname.split('/o/')[1].split('?')[0];
                        await adminStorage.file(decodeURIComponent(path)).delete();
                    } catch (e) {
                        console.error(`Failed to delete image for product ${productId}:`, e);
                    }
                }
            }
        }
    
        await productRef.delete();
    
        return NextResponse.json({ success: true, message: 'Product deleted successfully' });
      } catch (error: any) {
        console.error('Delete Product Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
}
