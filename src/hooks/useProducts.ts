/** @format */

import { useState, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  setDoc,
  deleteDoc,
  serverTimestamp,
  QueryConstraint,
  limit,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export interface ProductImage {
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id?: string;
  colorId: string | null;
  sizeId: string | null;
  stock: number;
  sku: string;
}

export interface Product {
  id: string;
  nameAr: string;
  name: string;
  descriptionAr: string;
  description: string;
  detailedDescriptionAr?: string;
  detailedDescription?: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  sku: string;
  stock: number;
  categoryId: string;
  rating: number;
  reviewsCount: number;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  onSale: boolean;
  isActive: boolean;
  hasVariants: boolean;
  images: ProductImage[];
  category?: any;
  createdAt: any;
  updatedAt: any;
  tags?: string[];
  tagsAr?: string[];
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  weight?: number;
}

export interface ProductFilter {
  category?: string;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  onSale?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (filters?: ProductFilter) => {
    setLoading(true);
    setError(null);
    try {
      const productsRef = collection(db, "products");
      const constraints: QueryConstraint[] = [];

      if (filters) {
        if (filters.category) {
          constraints.push(where("categoryId", "==", filters.category));
        }
        if (filters.featured) {
          constraints.push(where("featured", "==", true));
        }
        if (filters.newArrival) {
          constraints.push(where("newArrival", "==", true));
        }
        if (filters.bestSeller) {
          constraints.push(where("bestSeller", "==", true));
        }
        if (filters.onSale) {
          constraints.push(where("onSale", "==", true));
        }
        if (filters.inStock) {
          constraints.push(where("stock", ">", 0));
        }
      }

      constraints.push(orderBy("createdAt", "desc"));

      const q = query(productsRef, ...constraints);
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = [];

      for (const document of querySnapshot.docs) {
        const productData = document.data() as Product;

        if (productData.categoryId) {
          const categoryDoc = await getDoc(
            doc(db, "categories", productData.categoryId)
          );
          if (categoryDoc.exists()) {
            productData.category = {
              id: categoryDoc.id,
              ...categoryDoc.data(),
            };
          }
        }

        let includeProduct = true;
        if (filters?.search) {
          const searchTerms = filters.search.toLowerCase();
          const searchableFields = [
            productData.nameAr?.toLowerCase(),
            productData.name?.toLowerCase(),
            productData.descriptionAr?.toLowerCase(),
            productData.description?.toLowerCase(),
            ...(productData.tags || []).map((tag) => tag.toLowerCase()),
            ...(productData.tagsAr || []).map((tag) => tag.toLowerCase()),
          ];
          includeProduct = searchableFields.some(
            (field) => field && field.includes(searchTerms)
          );
        }

        if (filters?.minPrice !== undefined) {
          const price = productData.salePrice || productData.price;
          includeProduct = includeProduct && price >= filters.minPrice;
        }

        if (filters?.maxPrice !== undefined) {
          const price = productData.salePrice || productData.price;
          includeProduct = includeProduct && price <= filters.maxPrice;
        }

        if (includeProduct) {
          fetchedProducts.push({
            ...productData,
            id: document.id,
          });
        }
      }

      setProducts(fetchedProducts);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductBySlug = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const productsRef = collection(db, "products");
      const q = query(productsRef, where("slug", "==", slug), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Product not found");
        return null;
      }

      const productDoc = querySnapshot.docs[0];
      const productData = productDoc.data() as Product;

      if (productData.categoryId) {
        const categoryDoc = await getDoc(
          doc(db, "categories", productData.categoryId)
        );
        if (categoryDoc.exists()) {
          productData.category = { id: categoryDoc.id, ...categoryDoc.data() };
        }
      }

      return {
        ...productData,
        id: productDoc.id,
      };
    } catch (error: any) {
      console.error("Error fetching product by slug:", error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const addProduct = async (
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">,
    imageFiles: File[]
  ) => {
    setLoading(true);
    try {
      const productsRef = collection(db, "products");
      const newProductRef = doc(productsRef);
      const productId = newProductRef.id;

      const images: ProductImage[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageRef = ref(storage, `products/${productId}/${file.name}`);
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);
        images.push({
          imageUrl,
          altText: productData.nameAr,
          sortOrder: i,
          isPrimary: i === 0,
        });
      }

      const timestamp = serverTimestamp();
      await setDoc(newProductRef, {
        ...productData,
        images,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return productId;
    } catch (error: any) {
      console.error("Error adding product:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (
    productId: string,
    productData: Partial<Product>,
    newImageFiles?: File[],
    imagesToDelete?: string[]
  ) => {
    setLoading(true);
    try {
      const productRef = doc(db, "products", productId);
      const productDoc = await getDoc(productRef);
      if (!productDoc.exists()) {
        throw new Error("Product not found");
      }
      const currentProduct = productDoc.data() as Product;
      let updatedImages = [...(currentProduct.images || [])];

      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imageUrl of imagesToDelete) {
          try {
            const imagePath = decodeURIComponent(imageUrl.split("/o/")[1].split("?")[0]);
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
        updatedImages = updatedImages.filter(img => !imagesToDelete.includes(img.imageUrl));
      }

      if (newImageFiles && newImageFiles.length > 0) {
        for (let i = 0; i < newImageFiles.length; i++) {
          const file = newImageFiles[i];
          const imageRef = ref(storage, `products/${productId}/${file.name}`);
          await uploadBytes(imageRef, file);
          const imageUrl = await getDownloadURL(imageRef);
          updatedImages.push({
            imageUrl,
            altText: productData.nameAr || currentProduct.nameAr,
            sortOrder: updatedImages.length,
            isPrimary: updatedImages.length === 0,
          });
        }
      }

      await updateDoc(productRef, {
        ...productData,
        images: updatedImages,
        updatedAt: serverTimestamp(),
      });

      setProducts(
        products.map((product) =>
          product.id === productId
            ? { ...product, ...productData, images: updatedImages }
            : product
        )
      );
      return true;
    } catch (error: any) {
      console.error("Error updating product:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    setLoading(true);
    try {
      const productRef = doc(db, "products", productId);
      const productDoc = await getDoc(productRef);
      if (!productDoc.exists()) {
        throw new Error("Product not found");
      }
      const productData = productDoc.data() as Product;

      if (productData.images && productData.images.length > 0) {
        for (const image of productData.images) {
          try {
            const imagePath = decodeURIComponent(image.imageUrl.split("/o/")[1].split("?")[0]);
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
      }

      await deleteDoc(productRef);
      setProducts(products.filter((product) => product.id !== productId));
      return true;
    } catch (error: any) {
      console.error("Error deleting product:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
    fetchProducts,
    fetchProductBySlug,
    addProduct,
    updateProduct,
    deleteProduct,
  };
};
