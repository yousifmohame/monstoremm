import { useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import type { Product } from './useProducts';

export const useAdminProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            if (!idToken) throw new Error("Authentication required");
            const response = await fetch('/api/admin/products', {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch products');
            const data = await response.json();
            setProducts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProductById = useCallback(async (productId: string) => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            if (!idToken) throw new Error("Authentication required");
            const response = await fetch(`/api/admin/products/${productId}`, {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch product');
            const data = await response.json();
            setProduct(data);
            return data;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const addProduct = useCallback(async (productData: Omit<Product, "id" | "createdAt" | "updatedAt">, imageFiles: File[]) => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            if (!idToken) throw new Error("Authentication required");
            
            const formData = new FormData();
            formData.append('productData', JSON.stringify(productData));
            imageFiles.forEach(file => {
                formData.append('images', file);
            });

            const response = await fetch('/api/admin/products/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
                body: formData, 
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Failed to add product');
            }
            await fetchProducts();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchProducts]);

    const updateProduct = useCallback(async (productId: string, updateData: Partial<Product>, newImageFiles: File[] = [], imagesToDelete: string[] = []) => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            if (!idToken) throw new Error("Authentication required");

            const formData = new FormData();
            formData.append('productData', JSON.stringify(updateData));
            formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
            
            newImageFiles.forEach(file => {
                formData.append('newImages', file);
            });

            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${idToken}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update product');
            }
            
            await fetchProducts();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchProducts]);

    const deleteProduct = useCallback(async (productId: string) => {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (!idToken) throw new Error("Authentication required");
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${idToken}` },
        });
        if (!response.ok) throw new Error('Failed to delete product');
        setProducts(prev => prev.filter(p => p.id !== productId));
    }, []);

    return { products, product, loading, error, fetchProducts, fetchProductById, addProduct, updateProduct, deleteProduct };
};
