/** @format */

import { useState, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Category {
  id: string;
  nameAr: string;
  name: string;
  slug: string;
  description: string;
  descriptionAr: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  productsCount?: number;
  _count?: {
    products: number;
  };
  createdAt?: FirebaseFirestore.Timestamp | Date;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (itemsLimit?: number) => {
    setLoading(true);
    setError(null);
    try {
      // This fetch call goes to the API route defined above
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();

      const fetchedCategories: Category[] = data.map((categoryData: any) => {
        return {
          id: categoryData.id,
          nameAr: categoryData.nameAr,
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description,
          descriptionAr: categoryData.descriptionAr,
          imageUrl: categoryData.imageUrl,
          sortOrder: categoryData.sortOrder,
          isActive: categoryData.isActive,
          _count: {
            // It correctly reads 'productsCount' from the API response
            products: categoryData.productsCount || 0,
          },
          createdAt: categoryData.createdAt?.toDate ? categoryData.createdAt.toDate() : categoryData.createdAt,
          updatedAt: categoryData.updatedAt?.toDate ? categoryData.updatedAt.toDate() : categoryData.updatedAt,
        };
      });

      setCategories(fetchedCategories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      setError(error.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryBySlug = useCallback(async (slug: string) => {
    // ... (This function remains the same)
    setLoading(true);
    setError(null);
    try {
      const categoriesRef = collection(db, "categories");
      const q = query(categoriesRef, where("slug", "==", slug), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Category not found");
        return null;
      }
      
      const categoryDoc = querySnapshot.docs[0];
      const categoryData = categoryDoc.data();
      
      // Also calculate product count for the single category
      const productsRef = collection(db, 'products');
      const productsQuery = query(productsRef, where('categoryId', '==', categoryDoc.id));
      const productsSnapshot = await getCountFromServer(productsQuery);
      const productsCount = productsSnapshot.data().count;

      return {
        ...categoryData,
        id: categoryDoc.id,
        _count: {
          products: productsCount || 0,
        },
        createdAt: categoryData.createdAt?.toDate(),
        updatedAt: categoryData.updatedAt?.toDate(),
      } as Category;
    } catch (error: any) {
      console.error("Error fetching category by slug:", error);
      setError(error.message || "An unknown error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    fetchCategoryBySlug,
  };
};
