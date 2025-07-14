import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Helper function to get user ID and name from token
async function getAuthData(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  // Fetch user's full name from your users collection
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  const userName = userDoc.exists ? userDoc.data()?.fullName : 'Anonymous';

  return { uid: decodedToken.uid, name: userName };
}

// GET: Fetch all reviews for a specific product
export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
    try {
        const { productId } = params;
        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        const reviewsRef = adminDb.collection('products').doc(productId).collection('reviews');
        const querySnapshot = await reviewsRef.orderBy('createdAt', 'desc').get();

        const reviews = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate().toISOString()
        }));

        return NextResponse.json(reviews);

    } catch (error: any) {
        console.error('Fetch Reviews API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


// POST: Add a new review to a product
export async function POST(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const { uid, name: userName } = await getAuthData(request);
    const { productId } = params;
    const { rating, title, comment } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    if (!rating || !title || !comment) {
        return NextResponse.json({ error: 'Rating, title, and comment are required' }, { status: 400 });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }

    const productRef = adminDb.collection('products').doc(productId);
    const reviewRef = productRef.collection('reviews').doc();

    const newReview = {
        userId: uid,
        userName,
        rating,
        title,
        comment,
        verifiedPurchase: true, // You might want more complex logic for this
        createdAt: FieldValue.serverTimestamp(),
    };

    // Use a transaction to update both the review and the product's average rating
    await adminDb.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
            throw new Error("Product not found");
        }

        // Create the new review
        transaction.set(reviewRef, newReview);

        // Calculate new average rating
        const currentData = productDoc.data();
        const currentRating = currentData?.rating || 0;
        const currentReviewsCount = currentData?.reviewsCount || 0;

        const newReviewsCount = currentReviewsCount + 1;
        const newTotalRating = (currentRating * currentReviewsCount) + rating;
        const newAverageRating = newTotalRating / newReviewsCount;
        
        // Update the product document
        transaction.update(productRef, {
            reviewsCount: FieldValue.increment(1),
            rating: newAverageRating
        });
    });

    return NextResponse.json({ success: true, message: 'Review added successfully.' });

  } catch (error: any) {
    console.error('Add Review API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
