/** @format */
import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  increment,
  QueryConstraint,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

export interface OrderItem {
  productId: string;
  productName: string;
  productNameAr: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantId?: string;
  color?: string;
  size?: string;
}

export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PAID" | "PENDING" | "FAILED";
  paymentMethod: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  items: OrderItem[];
  shippedAt?: any;
  deliveredAt?: any;
  createdAt: any;
  updatedAt: any;
}

export const useOrders = () => {
  const { user } = useAuth();
  const { clearCart } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isAdmin: boolean = false) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let ordersQuery;
      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

      if (isAdmin) {
        ordersQuery = collection(db, "orders");
      } else {
        ordersQuery = query(collection(db, "orders"), where("userId", "==", user.id));
      }
      
      const q = query(ordersQuery, ...constraints);
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOrders.push({
          id: doc.id,
          ...doc.data(),
        } as Order);
      });
      setOrders(fetchedOrders);
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchOrderById = async (orderId: string) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) {
        setError("Order not found");
        return null;
      }
      const orderData = orderDoc.data() as Order;
      if (orderData.userId !== user.id && !user.isAdmin) {
        setError("You are not authorized to view this order");
        return null;
      }
      return {
        ...orderData,
        id: orderDoc.id,
      };
    } catch (err: any) {
      console.error("Error fetching order:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderByOrderNumber = async (orderNumber: string) => {
    if (!user) {
      setError('Authentication required');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const cleanOrderNumber = orderNumber.trim().toUpperCase();
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("orderNumber", "==", cleanOrderNumber), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error(`Order ${cleanOrderNumber} not found`);
      }

      const orderDoc = querySnapshot.docs[0];
      const orderData = orderDoc.data() as Order;

      if (orderData.userId !== user.id && !user.isAdmin) {
        throw new Error('Unauthorized access to order');
      }

      return {
        ...orderData,
        id: orderDoc.id,
      };
    } catch (err: any) {
      console.error('Order fetch error:', err.message);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (
    orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const orderNumber = `ORD-${Date.now()}`;
      const ordersRef = collection(db, "orders");
      const newOrderRef = doc(ordersRef);
      const orderId = newOrderRef.id;
      const timestamp = serverTimestamp();

      await setDoc(newOrderRef, {
        ...orderData,
        userId: user.id,
        orderNumber,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await clearCart();
      const newOrder: Order = {
        id: orderId,
        orderNumber,
        ...orderData,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setOrders([newOrder, ...orders]);
      return orderId;
    } catch (err: any) {
      console.error("Error creating order:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: Order["status"],
    trackingInfo?: { trackingNumber: string; trackingUrl: string }
  ) => {
    if (!user || !user.isAdmin) return false;
    setLoading(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) throw new Error("Order not found");

      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (trackingInfo) {
        updateData.trackingNumber = trackingInfo.trackingNumber;
        updateData.trackingUrl = trackingInfo.trackingUrl;
      }
      if (status === "SHIPPED") {
        updateData.shippedAt = serverTimestamp();
      } else if (status === "DELIVERED") {
        updateData.deliveredAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
                ...(trackingInfo && {
                  trackingNumber: trackingInfo.trackingNumber,
                  trackingUrl: trackingInfo.trackingUrl,
                }),
                ...(status === "SHIPPED" && { shippedAt: new Date() }),
                ...(status === "DELIVERED" && { deliveredAt: new Date() }),
                updatedAt: new Date(),
              }
            : order
        )
      );
      return true;
    } catch (err: any) {
      console.error("Error updating order status:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc.exists()) throw new Error("Order not found");
      const orderData = orderDoc.data() as Order;

      if (orderData.userId !== user.id && !user.isAdmin) {
        throw new Error("You are not authorized to cancel this order");
      }
      if (orderData.status === "SHIPPED" || orderData.status === "DELIVERED") {
        throw new Error("Cannot cancel an order that has been shipped or delivered");
      }

      await updateDoc(orderRef, {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });

      const batch = writeBatch(db);
      for (const item of orderData.items) {
        const productRef = doc(db, "products", item.productId);
        if (item.variantId) {
          const productDoc = await getDoc(productRef);
          if (productDoc.exists()) {
            const productData = productDoc.data();
            const variants = productData.variants || [];
            const updatedVariants = variants.map((variant: any) =>
              variant.id === item.variantId
                ? { ...variant, stock: variant.stock + item.quantity }
                : variant
            );
            batch.update(productRef, { variants: updatedVariants });
          }
        } else {
          batch.update(productRef, { stock: increment(item.quantity) });
        }
      }
      await batch.commit();
      
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? { ...order, status: "CANCELLED", updatedAt: new Date() }
            : order
        )
      );
      return true;
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    orders,
    loading,
    error,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrderStatus,
    fetchOrderByOrderNumber,
    cancelOrder,
  };
};
