import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { order_id, transaction_id, response_code } = body;

        // Verify the request comes from Fatora.io (e.g., by checking a secret if they provide one)
        
        if (order_id && transaction_id) {
            const orderRef = adminDb.collection('orders').doc(order_id);
            const orderDoc = await orderRef.get();

            if (orderDoc.exists) {
                if (response_code === "000") { // '000' typically means success
                    await orderRef.update({
                        status: 'PROCESSING', // Update status to processing or paid
                        paymentStatus: 'PAID',
                        transactionId: transaction_id,
                        updatedAt: new Date(),
                    });

                    // You can also clear the user's cart here
                    const userId = orderDoc.data()?.userId;
                    if (userId) {
                        const cartRef = adminDb.collection('users').doc(userId).collection('cart');
                        const cartSnapshot = await cartRef.get();
                        const batch = adminDb.batch();
                        cartSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                    
                } else {
                    await orderRef.update({
                        status: 'FAILED',
                        paymentStatus: 'FAILED',
                        updatedAt: new Date(),
                    });
                }
            }
        }
        
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Fatora Webhook Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
