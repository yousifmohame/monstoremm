import { useState, useCallback, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export interface Notification {
  id: string;
  type: 'NEW_ORDER' | 'NEW_MESSAGE' | 'LOW_STOCK';
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string; // Keep as string for simplicity on the client
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Use useEffect to listen for real-time updates from Firestore
  useEffect(() => {
    // Reference to the notifications collection
    const notificationsRef = collection(db, 'notifications');
    // Query to order notifications by creation date (newest first)
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    // onSnapshot listens for real-time changes
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert timestamp to a serializable string format
          createdAt: data.createdAt?.toDate().toISOString(),
        } as Notification;
      });
      
      setNotifications(fetchedNotifications);
      
      // Calculate unread notifications
      const unread = fetchedNotifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Function to mark all notifications as read by calling our API
  const markAllAsRead = useCallback(async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Authentication required");
      
      await fetch('/api/admin/notifications', {
        method: 'POST', // This POST request will trigger the mark-as-read logic in the API
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      // The onSnapshot listener will automatically update the UI
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }, []);

  return { notifications, unreadCount, loading, markAllAsRead };
};
