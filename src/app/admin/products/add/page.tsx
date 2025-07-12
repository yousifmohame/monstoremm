'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Package, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaUpload, { MediaItem } from '@/components/MediaUpload';
import { useAuth } from '@/hooks/useAuth';
import { useAdminProducts } from '@/hooks/useAdminProducts'; 
import { useCategories, Category } from '@/hooks/useCategories';
import { Product, ProductVariant } from '@/hooks/useProducts';

const generateSlug = (text: string) => {
  if (!text) return '';
  return text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').trim();
};

export default function AddProductPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { addProduct, loading: isSubmitting } = useAdminProducts();
  const { categories, fetchCategories } = useCategories();

  const [formData, setFormData] = useState({
    nameAr: '', name: '', slug: '', descriptionAr: '',
    description: '', detailedDescriptionAr: '', detailedDescription: '',
    price: '', salePrice: '', sku: '', stock: '', categoryId: '',
    tags: '', tagsAr: '', featured: false, newArrival: false,
    bestSeller: false, onSale: false, weight: '', hasVariants: false,
  });

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    if (user && profile?.isAdmin) {
      fetchCategories();
    }
  }, [user, profile, fetchCategories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => {
      const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'name') newState.slug = generateSlug(value);
      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (media.length === 0) {
      alert('يجب إضافة صورة واحدة على الأقل للمنتج.');
      return;
    }
    if (!formData.categoryId) {
      alert('يجب اختيار فئة للمنتج.');
      return;
    }

    try {
      const productData: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
        nameAr: formData.nameAr,
        name: formData.name,
        slug: formData.slug,
        descriptionAr: formData.descriptionAr,
        description: formData.description,
        detailedDescriptionAr: formData.detailedDescriptionAr,
        detailedDescription: formData.detailedDescription,
        price: parseFloat(formData.price) || 0,
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
        sku: formData.sku,
        stock: variants.reduce((total, v) => total + v.stock, parseInt(formData.stock) || 0),
        categoryId: formData.categoryId,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        tagsAr: formData.tagsAr.split(',').map(tag => tag.trim()).filter(Boolean),
        featured: formData.featured,
        newArrival: formData.newArrival,
        bestSeller: formData.bestSeller,
        onSale: formData.onSale,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        colors: selectedColors,
        sizes: selectedSizes,
        variants: formData.hasVariants ? variants : [],
        images: [] as any[],
        hasVariants: formData.hasVariants,
        rating: 0,
        reviewsCount: 0,
        isActive: true,
      };

      const filesToUpload: File[] = media
      .filter((item): item is MediaItem & { file: File } => !!item.file && item.file instanceof File)
      .map(item => item.file);


      await addProduct(productData, filesToUpload);

      alert('تم إضافة المنتج بنجاح!');
      router.push('/admin/products');
    } catch (error) {
      console.error("Failed to add product:", error);
      alert('حدث خطأ أثناء إضافة المنتج.');
    }
  };
  
  if (!user || !profile?.isAdmin) {
    return <div>غير مصرح لك بالدخول.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-gray-800">إضافة منتج جديد</h1></div>
          <button onClick={() => router.back()} className="flex items-center gap-2"><ArrowLeft /> العودة</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="anime-card p-8">
                <h2 className="text-2xl font-bold mb-6"><Package /> المعلومات الأساسية</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2">اسم المنتج (عربي) *</label>
                    <input type="text" name="nameAr" value={formData.nameAr} onChange={handleChange} className="input-field" required />
                  </div>
                  <div>
                    <label className="block mb-2">اسم المنتج (إنجليزي) *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2">الرابط (slug)</label>
                    <input type="text" name="slug" value={formData.slug} className="input-field bg-gray-100" readOnly />
                  </div>
                </div>
              </div>
              <div className="anime-card p-8">
                <h2 className="text-2xl font-bold mb-6"><FileText /> صور المنتج</h2>
                <MediaUpload media={media} onMediaChange={setMedia} />
              </div>
            </div>
            <div className="space-y-8">
              <div className="anime-card p-6">
                <h3 className="text-xl font-bold mb-4">الفئة والحالة</h3>
                <div>
                  <label className="block mb-2">الفئة *</label>
                  <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="input-field" required>
                    <option value="">اختر الفئة</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="anime-card p-6">
                <h3 className="text-xl font-bold mb-4">الإجراءات</h3>
                <button type="submit" disabled={isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                  {isSubmitting ? <div className="loading-spinner-sm"></div> : <><Save />حفظ المنتج</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}