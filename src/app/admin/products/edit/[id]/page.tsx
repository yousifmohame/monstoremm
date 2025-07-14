'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Package, DollarSign, Tag, FileText, Palette, Ruler } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaUpload, { MediaItem } from '@/components/MediaUpload';
import { useAuth } from '@/hooks/useAuth';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { useCategories } from '@/hooks/useCategories';
import { colorOptions, sizeOptions } from '@/lib/mockData';
import { Product, ProductVariant } from '@/hooks/useProducts';

// Helper function to generate a URL-friendly slug
const generateSlug = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim();
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { product, fetchProductById, updateProduct, loading: isSubmitting, error: apiError } = useAdminProducts();
  const { categories, fetchCategories } = useCategories();

  const [formData, setFormData] = useState({
    nameAr: '', name: '', slug: '', descriptionAr: '', description: '',
    detailedDescriptionAr: '', detailedDescription: '', price: '',
    salePrice: '', sku: '', stock: '', categoryId: '', tags: '',
    tagsAr: '', featured: false, newArrival: false, bestSeller: false,
    onSale: false, weight: '', hasVariants: false,
  });

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([]);
  const [showVariantsTable, setShowVariantsTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.isAdmin) {
      fetchCategories();
      fetchProductById(params.id);
    }
  }, [user, profile, params.id, fetchCategories, fetchProductById]);

  useEffect(() => {
    if (product) {
      setFormData({
        nameAr: product.nameAr || '',
        name: product.name || '',
        slug: product.slug || '',
        descriptionAr: product.descriptionAr || '',
        description: product.description || '',
        detailedDescriptionAr: product.detailedDescriptionAr || '',
        detailedDescription: product.detailedDescription || '',
        price: product.price?.toString() || '',
        salePrice: product.salePrice?.toString() || '',
        sku: product.sku || '',
        stock: product.stock?.toString() || '',
        categoryId: product.categoryId || '',
        tags: product.tags?.join(', ') || '',
        tagsAr: product.tagsAr?.join(', ') || '',
        featured: product.featured || false,
        newArrival: product.newArrival || false,
        bestSeller: product.bestSeller || false,
        onSale: product.onSale || false,
        weight: product.weight?.toString() || '',
        hasVariants: product.hasVariants || false,
      });

      setMedia(product.images?.map((img: any, index: number) => ({
        id: `${img.imageUrl}-${index}`,
        url: img.imageUrl,
        type: 'image',
        name: img.altText || `Image ${index + 1}`,
      })) || []);

      setSelectedColors(product.colors || []);
      setSelectedSizes(product.sizes || []);
      setVariants(product.variants || []);
      if (product.hasVariants && product.variants && product.variants.length > 0) {
        setShowVariantsTable(true);
      }
    }
  }, [product]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => {
        const newState = { ...prev, [name]: checked !== undefined ? checked : value };
        if (name === 'name') {
            newState.slug = generateSlug(value);
        }
        return newState;
    });

    if (name === 'hasVariants' && !checked) {
      setShowVariantsTable(false);
    }
  }, []);

  const handleColorToggle = (colorId: string) => setSelectedColors(prev => prev.includes(colorId) ? prev.filter(id => id !== colorId) : [...prev, colorId]);
  const handleSizeToggle = (sizeId: string) => setSelectedSizes(prev => prev.includes(sizeId) ? prev.filter(id => id !== sizeId) : [...prev, sizeId]);

  const generateVariants = () => {
    if (!formData.hasVariants) return;
    const newVariants: Partial<ProductVariant>[] = [];
    const baseSkuCode = formData.sku || 'PROD';
    const hasColors = selectedColors.length > 0;
    const hasSizes = selectedSizes.length > 0;

    if (!hasColors && !hasSizes) {
      setVariants([]);
      setShowVariantsTable(false);
      return;
    }

    if (hasColors && !hasSizes) {
      selectedColors.forEach(colorId => {
        const existing = variants.find(v => v.colorId === colorId && !v.sizeId);
        newVariants.push(existing || { colorId, sizeId: null, stock: 0, sku: `${baseSkuCode}-${colorOptions.find(c=>c.id===colorId)?.name.slice(0,3)}` });
      });
    } else if (!hasColors && hasSizes) {
      selectedSizes.forEach(sizeId => {
        const existing = variants.find(v => v.sizeId === sizeId && !v.colorId);
        newVariants.push(existing || { colorId: null, sizeId, stock: 0, sku: `${baseSkuCode}-${sizeOptions.find(s=>s.id===sizeId)?.value}` });
      });
    } else {
      selectedColors.forEach(colorId => {
        selectedSizes.forEach(sizeId => {
          const existing = variants.find(v => v.colorId === colorId && v.sizeId === sizeId);
          newVariants.push(existing || { colorId, sizeId, stock: 0, sku: `${baseSkuCode}-${colorOptions.find(c=>c.id===colorId)?.name.slice(0,3)}-${sizeOptions.find(s=>s.id===sizeId)?.value}` });
        });
      });
    }
    setVariants(newVariants);
    setShowVariantsTable(true);
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: field === 'stock' ? parseInt(value, 10) || 0 : value };
    setVariants(updatedVariants);
  };

  const getTotalStock = () => formData.hasVariants ? variants.reduce((total, v) => total + (v.stock || 0), 0) : parseInt(formData.stock) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const filesToUpload = media.filter(item => item.file).map(item => item.file as File);
    const existingImageUrls = media.filter(item => !item.file).map(item => item.url);
    const imagesToDelete = product.images?.filter((img: any) => !existingImageUrls.includes(img.imageUrl)).map((img: any) => img.imageUrl);

    const productUpdateData: Partial<Product> = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
      stock: getTotalStock(),
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      tagsAr: formData.tagsAr.split(',').map(tag => tag.trim()).filter(Boolean),
      colors: selectedColors,
      sizes: selectedSizes,
      variants: formData.hasVariants ? (variants as ProductVariant[]) : [],
    };
    
    try {
      await updateProduct(product.id, productUpdateData, filesToUpload, imagesToDelete);
      alert('✅ تم تحديث المنتج بنجاح!');
      router.push('/admin/products');
    } catch (err) {
      console.error("Update failed:", err);
      setError(`❌ فشل في تحديث المنتج: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isSubmitting || (!product && !apiError)) {
    return <div className="min-h-screen flex items-center justify-center">جاري تحميل بيانات المنتج...</div>;
  }
  
  if (apiError) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">خطأ: {apiError}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-gray-800">تعديل المنتج: {product?.nameAr}</h1></div>
          <button onClick={() => router.back()} className="flex items-center gap-2"><ArrowLeft /> العودة</button>
        </div>
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="anime-card p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Package className="h-6 w-6 text-primary-600" /> المعلومات الأساسية</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <input name="nameAr" value={formData.nameAr} onChange={handleChange} placeholder="اسم المنتج (عربي) *" className="input-field" required />
                  <input name="name" value={formData.name} onChange={handleChange} placeholder="اسم المنتج (إنجليزي) *" className="input-field text-left" required />
                </div>
                <textarea name="descriptionAr" value={formData.descriptionAr} onChange={handleChange} rows={3} className="input-field mt-6" placeholder="وصف مختصر (عربي) *" required />
                <textarea name="detailedDescriptionAr" value={formData.detailedDescriptionAr} onChange={handleChange} rows={5} className="input-field mt-6" placeholder="وصف تفصيلي (عربي)" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="anime-card p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FileText className="h-6 w-6 text-primary-600" /> صور وفيديوهات المنتج</h2>
                <MediaUpload media={media} onMediaChange={setMedia} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="anime-card p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Palette /> متغيرات المنتج</h2>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="hasVariants" checked={formData.hasVariants} onChange={handleChange} className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span>المنتج له متغيرات</span>
                    </label>
                </div>
                {formData.hasVariants && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3">الألوان</h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                {colorOptions.map(color => <div key={color.id} onClick={() => handleColorToggle(color.id)} className={`border rounded-lg p-3 cursor-pointer ${selectedColors.includes(color.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full border" style={{backgroundColor: color.value}}></div><span>{color.nameAr}</span></div></div>)}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-3">الأحجام</h3>
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                                {sizeOptions.map(size => <div key={size.id} onClick={() => handleSizeToggle(size.id)} className={`border rounded-lg p-3 text-center cursor-pointer ${selectedSizes.includes(size.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>{size.nameAr}</div>)}
                            </div>
                        </div>
                        <div className="flex justify-center"><button type="button" onClick={generateVariants} className="btn-secondary">إنشاء/تحديث المتغيرات</button></div>
                        {showVariantsTable && variants.length > 0 && <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>اللون</th><th>الحجم</th><th>SKU</th><th>المخزون</th></tr></thead><tbody>{variants.map((v, i) => <tr key={i}><td>{colorOptions.find(c=>c.id===v.colorId)?.nameAr || '-'}</td><td>{sizeOptions.find(s=>s.id===v.sizeId)?.nameAr || '-'}</td><td><input value={v.sku} onChange={e=>handleVariantChange(i,'sku',e.target.value)} className="input-field p-1"/></td><td><input type="number" value={v.stock} onChange={e=>handleVariantChange(i,'stock',e.target.value)} className="input-field p-1 w-20"/></td></tr>)}</tbody></table></div>}
                    </div>
                )}
              </motion.div>
            </div>

            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="anime-card p-6">
                <h3 className="text-xl font-bold mb-4">التسعير والمخزون</h3>
                <label>السعر الأساسي (ريال) *</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="input-field mb-4" required />
                <label>سعر التخفيض (ريال)</label><input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="input-field mb-4" />
                <label>SKU *</label><input type="text" name="sku" value={formData.sku} onChange={handleChange} className="input-field mb-4" required />
                <label>الكمية {formData.hasVariants && '(الإجمالي)'}</label><input type="number" name="stock" value={formData.hasVariants ? getTotalStock() : formData.stock} onChange={handleChange} className={`input-field ${formData.hasVariants ? 'bg-gray-100' : ''}`} disabled={formData.hasVariants} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="anime-card p-6">
                <h3 className="text-xl font-bold mb-4">التصنيف</h3>
                <label>الفئة *</label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="input-field" required>
                  <option value="">اختر الفئة</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.nameAr}</option>)}
                </select>
                <div className="mt-4 space-y-2">
                  <label className="flex items-center gap-2"><input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange}/>منتج مميز</label>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="anime-card p-6">
                <h3 className="text-xl font-bold mb-4">الإجراءات</h3>
                <button type="submit" disabled={isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                  {isSubmitting ? <div className="loading-spinner"></div> : <><Save /> حفظ التغييرات</>}
                </button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
