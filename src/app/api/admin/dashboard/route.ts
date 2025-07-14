import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic'; // This line is the fix

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error("Unauthorized");
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) throw new Error("Forbidden: Not an admin");
  return decodedToken.uid;
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const ordersPromise = adminDb.collection('orders').get();
    const usersPromise = adminDb.collection('users').get();
    const productsPromise = adminDb.collection('products').get();
    
    const [ordersSnapshot, usersSnapshot, productsSnapshot] = await Promise.all([
      ordersPromise,
      usersPromise,
      productsPromise,
    ]);

    const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
    const totalSales = ordersSnapshot.size;
    const totalUsers = usersSnapshot.size;
    const totalProducts = productsSnapshot.size;
    const pendingOrders = ordersSnapshot.docs.filter(doc => ['PENDING', 'PROCESSING'].includes(doc.data().status)).length;
    const outOfStockProducts = productsSnapshot.docs.filter(doc => doc.data().stock === 0).length;

    const recentProductsSnapshot = await adminDb.collection('products')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
      
    const recentProducts = recentProductsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nameAr: data.nameAr,
        price: data.price,
        salePrice: data.salePrice,
        images: data.images,
        slug: data.slug,
      };
    });

    const unreadMessagesSnapshot = await adminDb.collection('conversations').where('isReadByAdmin', '==', false).get();
    const unreadMessages = unreadMessagesSnapshot.size;

    const newReviewsSnapshot = await adminDb.collection('reviews').where('isReadByAdmin', '==', false).get();
    const newReviews = newReviewsSnapshot.size;

    return NextResponse.json({
      totalRevenue,
      totalSales,
      totalUsers,
      totalProducts,
      pendingOrders,
      outOfStockProducts,
      recentProducts,
      unreadMessages, 
      newReviews,
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Unauthorized") || error.message.includes("Forbidden") ? 401 : 500 }
    );
  }
}
