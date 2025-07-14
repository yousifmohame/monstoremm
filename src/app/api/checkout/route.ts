import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

// This function now reads the token from the Authorization header
async function getUserIdFromToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error("User not authenticated");
  }
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  return decodedToken.uid;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    const body = await request.json();
    const {
        shippingAddress,
        items,
        totalAmount,
        currency
    } = body;

    if (!shippingAddress || !items || !totalAmount) {
      return NextResponse.json({ error: "Missing required order information" }, { status: 400 });
    }

    const newOrderRef = adminDb.collection("orders").doc();
    const orderId = newOrderRef.id;
    await newOrderRef.set({
      userId,
      orderNumber: `ORD-${Date.now()}`,
      items,
      totalAmount,
      shippingAddress,
      currency,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const fatoraApiUrl = 'https://api.fatora.io/v1/payments/checkout';
    const fatoraApiToken = process.env.FATORA_API_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!fatoraApiToken || !baseUrl) {
        throw new Error("Server environment variables (FATORA_API_TOKEN or NEXT_PUBLIC_BASE_URL) are not configured.");
    }
    
    const clientInfo = {
        name: shippingAddress.fullName,
        phone: shippingAddress.phone,
        email: (await adminAuth.getUser(userId)).email,
        address: `${shippingAddress.address}, ${shippingAddress.city}`
    };

    const fatoraPayload = {
        amount: totalAmount,
        currency: currency,
        description: `Order #${orderId} from Kyotaku Store`,
        order_id: orderId,
        client: clientInfo,
        language: "ar",
        success_url: `${baseUrl}/orders?status=success`,
        failure_url: `${baseUrl}/checkout?status=failed`,
    };

    const fatoraResponse = await fetch(fatoraApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fatoraApiToken}`,
        },
        body: JSON.stringify(fatoraPayload),
    });

    const fatoraData = await fatoraResponse.json();

    if (!fatoraResponse.ok || !fatoraData.url) {
        await newOrderRef.update({ status: 'FAILED' });
        console.error("Fatora API Error:", fatoraData);
        // **THE FIX IS HERE**: Return the actual error from Fatora to the frontend
        throw new Error(fatoraData.message || "Failed to create payment link.");
    }

    return NextResponse.json({ success: true, paymentUrl: fatoraData.url });

  } catch (error: any) {
    console.error("Checkout API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
