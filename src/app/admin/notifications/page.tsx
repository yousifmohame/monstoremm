'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, MessageCircle, Package, Star, ShoppingBag, Search, Trash2, CheckCircle, ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useAdminNotifications, Notification } from '@/hooks/useAdminNotifications'; // Use the real hook
import TimeAgo from 'react-timeago';
// @ts-ignore
import arStrings from 'react-timeago/lib/language-strings/ar';
// @ts-ignore
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';

const formatter = buildFormatter(arStrings);

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'NEW_MESSAGE': return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'NEW_ORDER': return <Package className="h-5 w-5 text-green-500" />;
    case 'LOW_STOCK': return <ShoppingBag className="h-5 w-5 text-red-500" />;
    default: return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export default function AdminNotificationsPage() {
  const { user, profile } = useAuth();
  // Use the real hook to get notifications data
  const { notifications, unreadCount, loading, markAllAsRead } = useAdminNotifications();
  
  const [activeFilter, setActiveFilter] = useState<'all' | Notification['type']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // No need for selectedNotifications logic for now to simplify

  if (!user || !profile?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container-custom py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">غير مصرح</h1>
          <p className="text-gray-600 mb-8">ليس لديك صلاحية للوصول لهذه الصفحة</p>
          <a href="/" className="btn-primary">العودة للرئيسية</a>
        </div>
        <Footer />
      </div>
    );
  }

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === activeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.message.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">الإشعارات</h1>
            <p className="text-gray-600">إدارة جميع الإشعارات والتنبيهات</p>
          </div>
          <Link href="/admin"><button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"><ArrowLeft className="h-5 w-5" /> العودة للوحة التحكم</button></Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="anime-card p-4"><h3 className="text-sm font-semibold text-gray-500 mb-2">إجمالي الإشعارات</h3><p className="text-3xl font-bold text-gray-800">{notifications.length}</p></div>
          <div className="anime-card p-4"><h3 className="text-sm font-semibold text-gray-500 mb-2">غير مقروءة</h3><p className="text-3xl font-bold text-red-600">{unreadCount}</p></div>
          <div className="anime-card p-4"><h3 className="text-sm font-semibold text-gray-500 mb-2">رسائل جديدة</h3><p className="text-3xl font-bold text-blue-600">{notifications.filter(n => n.type === 'NEW_MESSAGE' && !n.isRead).length}</p></div>
          <div className="anime-card p-4"><h3 className="text-sm font-semibold text-gray-500 mb-2">طلبات جديدة</h3><p className="text-3xl font-bold text-green-600">{notifications.filter(n => n.type === 'NEW_ORDER' && !n.isRead).length}</p></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="البحث في الإشعارات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-right"/>
              </div>
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as any)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="all">جميع الإشعارات</option>
                <option value="NEW_MESSAGE">الرسائل</option>
                <option value="NEW_ORDER">الطلبات</option>
                <option value="LOW_STOCK">المخزون</option>
              </select>
            </div>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"><CheckCircle className="h-4 w-4" /> تعيين الكل كمقروء</button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          {loading ? (
             <div className="p-16 text-center"><div className="loading-dots"><div></div><div></div><div></div><div></div></div></div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center"><Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد إشعارات</h3></div>
          ) : (
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">النوع</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">الرسالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">الوقت</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((notification) => (
                    <tr key={notification.id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.type)}
                          <span className="text-sm">
                            {notification.type === 'NEW_MESSAGE' ? 'رسالة' : 
                             notification.type === 'NEW_ORDER' ? 'طلب' : 
                             'مخزون'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {notification.message}
                        {!notification.isRead && <span className="mr-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">جديد</span>}
                      </td>
                      <td className="px-4 py-4 text-gray-500 whitespace-nowrap"><TimeAgo date={notification.createdAt} formatter={formatter} /></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={notification.link}><button className="p-2 text-gray-600 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"><Eye className="h-4 w-4" /></button></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
