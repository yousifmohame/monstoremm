/** @format */
export const runtime = "nodejs";
export const dynamic = 'force-dynamic'; // This line is the fix

import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";
    const newArrival = searchParams.get("newArrival") === "true";
    const bestSeller = searchParams.get("bestSeller") === "true";
    const onSale = searchParams.get("onSale") === "true";
    const search = searchParams.get("search");
    const limitParam = searchParams.get("limit");
    const lastDocId = searchParams.get("lastDocId");

    let productsQuery = collection(db, "products");
    let constraints: any[] = [];

    if (category) {
      const categoriesRef = collection(db, "categories");
      const categoryQuery = query(categoriesRef, where("slug", "==", category));
      const categorySnapshot = await getDocs(categoryQuery);

      if (!categorySnapshot.empty) {
        const categoryId = categorySnapshot.docs[0].id;
        constraints.push(where("categoryId", "==", categoryId));
      } else {
        constraints.push(where("categoryId", "==", category));
      }
    }

    if (featured) {
      constraints.push(where("featured", "==", true));
    }

    if (newArrival) {
      constraints.push(where("newArrival", "==", true));
    }

    if (bestSeller) {
      constraints.push(where("bestSeller", "==", true));
    }

    if (onSale) {
      constraints.push(where("onSale", "==", true));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const limitValue = limitParam ? parseInt(limitParam) : 20;
    constraints.push(limit(limitValue));

    if (lastDocId) {
      const lastDocRef = doc(db, "products", lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);

      if (lastDocSnap.exists()) {
        constraints.push(startAfter(lastDocSnap));
      }
    }

    const q = query(productsQuery, ...constraints);
    const querySnapshot = await getDocs(q);

    const products: any[] = [];

    for (const document of querySnapshot.docs) {
      const productData = document.data();

      let category = null;
      if (productData.categoryId) {
        const categoryDoc = await getDoc(
          doc(db, "categories", productData.categoryId)
        );
        if (categoryDoc.exists()) {
          category = { id: categoryDoc.id, ...categoryDoc.data() };
        }
      }

      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch =
          productData.nameAr?.toLowerCase().includes(searchLower) ||
          productData.name?.toLowerCase().includes(searchLower);
        const descMatch =
          productData.descriptionAr?.toLowerCase().includes(searchLower) ||
          productData.description?.toLowerCase().includes(searchLower);
        const tagsMatch =
          productData.tags?.some((tag: string) =>
            tag.toLowerCase().includes(searchLower)
          ) ||
          productData.tagsAr?.some((tag: string) =>
            tag.toLowerCase().includes(searchLower)
          );

        if (!nameMatch && !descMatch && !tagsMatch) {
          continue;
        }
      }

      products.push({
        id: document.id,
        ...productData,
        category,
      });
    }

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Products API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
      const { ids } = await request.json();
  
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Product IDs are required" }, { status: 400 });
      }
  
      const productsRef = collection(db, "products");
      const q = query(productsRef, where("__name__", "in", ids));
      const querySnapshot = await getDocs(q);
      
      const products: any[] = [];
      for (const document of querySnapshot.docs) {
        const productData = document.data();
        let category = null;
        if (productData.categoryId) {
          const categoryDoc = await getDoc(doc(db, "categories", productData.categoryId));
          if (categoryDoc.exists()) {
            category = { id: categoryDoc.id, ...categoryDoc.data() };
          }
        }
        products.push({
          id: document.id,
          ...productData,
          category,
        });
      }
  
      return NextResponse.json(products);
    } catch (error: any) {
      console.error("Products POST API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
