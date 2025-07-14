import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useStore } from '@/store/useStore';
import { useProducts } from './useProducts';
import type { Product } from './useProducts';

export const useWishlist = () => {
  const { user } = useAuth();
  const { wishlist, removeFromWishlist: removeFromStore } = useStore();
  const { fetchProductsByIds } = useProducts();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlistProducts = useCallback(async () => {
    if (!user) {
        setWishlistProducts([]);
        setLoading(false);
        return;
    }
    if (wishlist.length === 0) {
      setWishlistProducts([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const products = await fetchProductsByIds(wishlist);
      setWishlistProducts(products);
    } catch (error) {
      console.error('Error fetching wishlist products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, wishlist, fetchProductsByIds]);

  useEffect(() => {
    fetchWishlistProducts();
  }, [fetchWishlistProducts]);
  
  const removeFromWishlist = async (productId: string) => {
    await removeFromStore(productId);
    // The component will re-render due to the change in the `wishlist` state from the store,
    // which will trigger the useEffect hook again to refetch the products.
  };

  return {
    wishlistProducts,
    loading,
    removeFromWishlist,
    refetch: fetchWishlistProducts,
  };
};
