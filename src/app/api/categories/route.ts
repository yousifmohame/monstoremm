export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, getCountFromServer, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('sortOrder', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const categories: any[] = [];
    
    // This loop calculates the product count for each category dynamically
    for (const doc of querySnapshot.docs) {
      const categoryData = doc.data();
      const productsRef = collection(db, 'products');
      const productsQuery = query(productsRef, where('categoryId', '==', doc.id));
      const productsSnapshot = await getCountFromServer(productsQuery);
      const productsCount = productsSnapshot.data().count;

      categories.push({
        id: doc.id,
        ...categoryData,
        // The fix is here: The key is 'productsCount'
        productsCount: productsCount
      });
    }
    
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
