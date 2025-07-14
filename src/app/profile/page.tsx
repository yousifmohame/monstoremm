'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Edit, Save, X, Package, Heart, Bell, Shield, Camera, Send, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Cart from '@/components/Cart';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, changeUserPassword, deleteAccount } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", address: "", city: "", postalCode: "",
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: ""
  });
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        postalCode: profile.postalCode || ''
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const updateUser = async (data: typeof formData) => {
    await fetch("/api/auth/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user?.id, ...data }),
    });
  };

  const handleSave = async () => {
    setMessage(null);
    try {
      await updateUser(formData);
      setMessage({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح!' });
      setIsEditing(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل تحديث الملف الشخصي.' });
    }
  };

  const handleChangePassword = async () => {
    setMessage(null);
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setMessage({ type: 'error', text: "كلمتا المرور الجديدتان غير متطابقتين" });
    }
    try {
      await changeUserPassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ type: 'success', text: "تم تحديث كلمة المرور بنجاح" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setMessage({ type: 'error', text: "فشل تحديث كلمة المرور. تأكد من كلمة المرور الحالية." });
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("هل أنت متأكد من حذف حسابك؟ سيتم فقدان جميع البيانات نهائيًا.")) {
      try {
        await deleteAccount();
        alert("تم حذف الحساب بنجاح.");
      } catch (err) {
        alert("حدث خطأ أثناء حذف الحساب.");
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'orders', label: 'طلباتي', icon: Package },
    { id: 'wishlist', label: 'قائمة الأمنيات', icon: Heart },
    { id: 'messages', label: 'الرسائل', icon: MessageCircle },
    { id: 'security', label: 'الأمان', icon: Shield }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">يجب تسجيل الدخول أولاً</h1>
          <p className="text-gray-600 mb-8">للوصول لملفك الشخصي، يرجى تسجيل الدخول.</p>
          <Link href="/auth/login" className="btn-primary">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container-custom py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="anime-card p-6 mb-6 text-center">
                <Image src={profile?.profileImage || '/placeholder.jpg'} alt={profile?.fullName || 'User'} width={96} height={96} className="w-24 h-24 object-cover rounded-full mx-auto mb-4" />
                <h2 className="text-xl font-bold">{profile?.fullName}</h2>
                <p className="text-gray-600">{profile?.email}</p>
                {profile?.isAdmin && <span className="mt-2 inline-block bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-sm font-semibold">مدير</span>}
            </div>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${activeTab === tab.id ? 'bg-primary-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <tab.icon className="h-5 w-5" />{tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {message && <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>}

            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="anime-card p-8">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold">الملف الشخصي</h1>
                  {!isEditing ? (<button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-primary-600 font-semibold"><Edit className="h-4 w-4" />تعديل</button>) : (<div className="flex gap-2"><button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save className="h-4 w-4" />حفظ</button><button onClick={() => setIsEditing(false)} className="btn-outline flex items-center gap-2"><X className="h-4 w-4" />إلغاء</button></div>)}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div><label className="block font-semibold mb-2">الاسم الكامل</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={!isEditing} className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`} /></div>
                  <div><label className="block font-semibold mb-2">البريد الإلكتروني</label><input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`} /></div>
                  <div><label className="block font-semibold mb-2">رقم الهاتف</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`} /></div>
                  <div><label className="block font-semibold mb-2">المدينة</label><input type="text" name="city" value={formData.city} onChange={handleChange} disabled={!isEditing} className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`} /></div>
                  <div className="md:col-span-2"><label className="block font-semibold mb-2">العنوان</label><input type="text" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`} /></div>
                  <div><label className="block font-semibold mb-2">الرمز البريدي</label><input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} disabled={!isEditing} className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`} /></div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="anime-card p-8">
                <h1 className="text-3xl font-bold mb-8">الأمان</h1>
                <div className="space-y-8">
                    <div className="border-b pb-6">
                        <h3 className="text-xl font-bold mb-4">تغيير كلمة المرور</h3>
                        <div className="space-y-4 max-w-md">
                            <input type="password" name="currentPassword" placeholder="كلمة المرور الحالية" value={passwordData.currentPassword} onChange={handlePasswordChange} className="input-field" />
                            <input type="password" name="newPassword" placeholder="كلمة المرور الجديدة" value={passwordData.newPassword} onChange={handlePasswordChange} className="input-field" />
                            <input type="password" name="confirmPassword" placeholder="تأكيد كلمة المرور الجديدة" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="input-field" />
                            <button onClick={handleChangePassword} className="btn-primary">تحديث كلمة المرور</button>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">حذف الحساب</h3>
                        <p className="text-gray-600 mb-4">سيؤدي حذف حسابك إلى فقدان جميع بياناتك وطلباتك بشكل نهائي.</p>
                        <button onClick={handleDeleteAccount} className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors">حذف الحساب نهائياً</button>
                    </div>
                </div>
              </motion.div>
            )}

            {/* Placeholder for other tabs */}
            {(activeTab === 'orders' || activeTab === 'wishlist' || activeTab === 'messages') && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="anime-card p-8 text-center">
                    <h1 className="text-3xl font-bold mb-4">قيد الإنشاء</h1>
                    <p>هذه الميزة ستكون متاحة قريباً!</p>
                </motion.div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <Cart />
    </div>
  );
}
