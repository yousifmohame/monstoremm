'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  CreditCard,
  User,
  Phone,
  MapPin,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function CheckoutPage() {
  const router = useRouter();
  // **THE FIX**: Get the getIdToken function from the auth hook
  const { user, profile, getIdToken } = useAuth();
  const { cart, getTotalPrice } = useStore();
  const { settings, loading: settingsLoading } = useSiteSettings();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    paymentMethod: 'fatora',
    notes: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        postalCode: profile.postalCode || '',
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (cart.length === 0) {
      router.push('/products');
    }
  }, [cart.length, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const subtotal = getTotalPrice();
  const shippingCost = settings?.shippingCost ?? 25.00;
  const taxRate = settings?.taxRate ?? 0.15;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + shippingCost + taxAmount;
  const currency = settings?.currency || 'SAR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }
      
      // **THE FIX**: Get the token before sending the request
      const idToken = await getIdToken(true);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // **THE FIX**: Send the token in the Authorization header
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            fullName: formData.fullName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
          },
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
          items: cart,
          totalAmount: totalAmount,
          currency: currency
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في إنشاء الطلب.');
      }

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        throw new Error('لم يتم استلام رابط الدفع.');
      }

    } catch (error: any) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container-custom py-20 text-center">
          <h1 className="text-3xl font-bold">يجب تسجيل الدخول أولاً</h1>
          <Link href="/auth/login" className="btn-primary mt-4">
            تسجيل الدخول
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">إتمام الطلب</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="anime-card p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <User className="h-6 w-6 text-primary-600" /> معلومات الشحن
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الاسم الكامل *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="input-field text-right" required />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2"><Phone className="inline h-4 w-4 ml-2" /> رقم الهاتف *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-field text-right" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-semibold mb-2"><MapPin className="inline h-4 w-4 ml-2" /> العنوان *</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="input-field text-right" required />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">المدينة *</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field text-right" required />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">الرمز البريدي</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="input-field text-right" />
                </div>
              </div>
            </motion.div>

            <motion.button type="submit" disabled={isProcessing || settingsLoading} className="w-full btn-primary text-lg py-4 flex items-center justify-center">
              {isProcessing ? (<div className="loading-spinner"></div>) : ('الانتقال إلى الدفع الآمن')}
            </motion.button>

            {errorMessage && (<div className="mt-4 text-red-600 text-center"><AlertCircle className="h-5 w-5 inline-block mr-2" />{errorMessage}</div>)}
          </div>

          <div className="lg:col-span-1">
            <div className="anime-card p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">ملخص الطلب</h2>
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Image src={item.image} alt={item.name} width={60} height={60} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1"><h3 className="font-semibold text-gray-800 text-sm">{item.name}</h3><p className="text-sm text-gray-600">{item.quantity} × {item.price.toFixed(2)} {currency}</p></div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="font-semibold">{subtotal.toFixed(2)} {currency}</span></div>
                <div className="flex justify-between"><span>الشحن:</span><span className="font-semibold">{shippingCost.toFixed(2)} {currency}</span></div>
                <div className="flex justify-between"><span>الضريبة ({(taxRate * 100).toFixed(0)}%):</span><span className="font-semibold">{taxAmount.toFixed(2)} {currency}</span></div>
                <div className="flex justify-between pt-3 border-t border-gray-200"><span className="font-bold">المجموع:</span><span className="font-bold text-primary-600">{totalAmount.toFixed(2)} {currency}</span></div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
