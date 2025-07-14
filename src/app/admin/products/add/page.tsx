'use client';

import React, { useState, useEffect } from 'react';
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
import Link from 'next/link';

// Helper function to generate a URL-friendly slug
const generateSlug = (text: string) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim();
};

export default function AddProductPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { addProduct, loading: isSubmitting } = useAdminProducts();
  const { categories, fetchCategories } = useCategories();

  const [formData, setFormData] = useState({
    nameAr: '',
    name: '',
    slug: '',
    descriptionAr: '',
    description: '',
    detailedDescriptionAr: '',
    detailedDescription: '',
    price: '',
    salePrice: '',
    sku: '',
    stock: '',
    categoryId: '',
    tags: '',
    tagsAr: '',
    featured: false,
    newArrival: false,
    bestSeller: false,
    onSale: false,
    weight: '',
    hasVariants: false,
  });

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([]);
  const [showVariantsTable, setShowVariantsTable] = useState(false);

  useEffect(() => {
    if (user && profile?.isAdmin) {
      fetchCategories();
    }
  }, [user, profile, fetchCategories]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      setSelectedColors([]);
      setSelectedSizes([]);
      setVariants([]);
      setShowVariantsTable(false);
    }
  };

  const handleColorToggle = (colorId: string) => {
    setSelectedColors(prev =>
      prev.includes(colorId) ? prev.filter(id => id !== colorId) : [...prev, colorId]
    );
  };

  const handleSizeToggle = (sizeId: string) => {
    setSelectedSizes(prev =>
      prev.includes(sizeId) ? prev.filter(id => id !== sizeId) : [...prev, sizeId]
    );
  };

  // Generate product variants based on selected colors and sizes
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
        const color = colorOptions.find(c => c.id === colorId);
        newVariants.push({
          colorId,
          sizeId: null,
          stock: 0,
          sku: `${baseSkuCode}-${color?.name.substring(0, 3).toUpperCase() || 'CLR'}`
        });
      });
    } else if (!hasColors && hasSizes) {
      selectedSizes.forEach(sizeId => {
        const size = sizeOptions.find(s => s.id === sizeId);
        newVariants.push({
          colorId: null,
          sizeId,
          stock: 0,
          sku: `${baseSkuCode}-${size?.value || 'SIZE'}`
        });
      });
    } else {
      selectedColors.forEach(colorId => {
        const color = colorOptions.find(c => c.id === colorId);
        selectedSizes.forEach(sizeId => {
          const size = sizeOptions.find(s => s.id === sizeId);
          newVariants.push({
            colorId,
            sizeId,
            stock: 0,
            sku: `${baseSkuCode}-${color?.name.substring(0, 3).toUpperCase() || 'CLR'}-${size?.value || 'SIZE'}`
          });
        });
      });
    }

    setVariants(newVariants);
    setShowVariantsTable(true);
  };
  
  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = {
      ...updatedVariants[index],
      [field]: field === 'stock' ? parseInt(value) || 0 : value
    };
    setVariants(updatedVariants);
  };

  const getTotalStock = () => {
    if (!formData.hasVariants) return parseInt(formData.stock) || 0;
    return variants.reduce((total, variant) => total + (variant.stock || 0), 0);
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

    const productData: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
      stock: getTotalStock(),
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      tagsAr: formData.tagsAr.split(',').map(tag => tag.trim()).filter(Boolean),
      images: [], // Images will be handled by the hook
      colors: selectedColors,
      sizes: selectedSizes,
      variants: formData.hasVariants ? (variants as ProductVariant[]) : [],
      rating: 0,
      reviewsCount: 0,
      isActive: true,
    };

    const filesToUpload = media
      .map(item => item.file)
      .filter((file): file is File => file instanceof File);

    try {
      await addProduct(productData, filesToUpload);
      alert('تم إضافة المنتج بنجاح!');
      router.push('/admin/products');
    } catch (error) {
      console.error("Failed to add product:", error);
      alert(`حدث خطأ أثناء إضافة المنتج: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!user || !profile?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">غير مصرح</h1>
          <p className="text-gray-600 mb-8">ليس لديك صلاحية للوصول لهذه الصفحة</p>
          <Link href="/" className="btn-primary">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">إضافة منتج جديد</h1>
            <p className="text-gray-600">أضف منتج جديد إلى متجر كيوتاكو</p>
          </div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-5 w-5" /> العودة
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Basic Info */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="anime-card p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Package className="h-6 w-6 text-primary-600" /> المعلومات الأساسية</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <input name="nameAr" value={formData.nameAr} onChange={handleChange} className="input-field" placeholder="اسم المنتج (عربي) *" required />
                  <input name="name" value={formData.name} onChange={handleChange} className="input-field text-left" placeholder="Product Name (English) *" required />
                </div>
                <textarea name="descriptionAr" value={formData.descriptionAr} onChange={handleChange} rows={3} className="input-field mt-6" placeholder="وصف مختصر (عربي) *" required />
                <textarea name="detailedDescriptionAr" value={formData.detailedDescriptionAr} onChange={handleChange} rows={5} className="input-field mt-6" placeholder="وصف تفصيلي (عربي)" />
              </motion.div>

              {/* Media Upload */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="anime-card p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FileText className="h-6 w-6 text-primary-600" /> صور وفيديوهات المنتج</h2>
                <MediaUpload media={media} onMediaChange={setMedia} />
              </motion.div>

              {/* Variants */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="anime-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Palette className="h-6 w-6 text-primary-600" /> متغيرات المنتج</h2>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="hasVariants" checked={formData.hasVariants} onChange={handleChange} className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span>المنتج له متغيرات (ألوان/أحجام)</span>
                  </label>
                </div>
                {formData.hasVariants && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">الألوان</h3>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {colorOptions.map(color => (
                          <div key={color.id} onClick={() => handleColorToggle(color.id)} className={`border rounded-lg p-3 cursor-pointer ${selectedColors.includes(color.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full border" style={{ backgroundColor: color.value }}></div><span>{color.nameAr}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-3">الأحجام</h3>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                        {sizeOptions.map(size => (
                          <div key={size.id} onClick={() => handleSizeToggle(size.id)} className={`border rounded-lg p-3 text-center cursor-pointer ${selectedSizes.includes(size.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                            {size.nameAr}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center"><button type="button" onClick={generateVariants} className="btn-secondary">إنشاء المتغيرات</button></div>
                    {showVariantsTable && variants.length > 0 && (
                      <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>اللون</th><th>الحجم</th><th>SKU</th><th>المخزون</th></tr></thead><tbody>{variants.map((v, i) => <tr key={i}><td>{colorOptions.find(c=>c.id===v.colorId)?.nameAr || '-'}</td><td>{sizeOptions.find(s=>s.id===v.sizeId)?.nameAr || '-'}</td><td><input value={v.sku} onChange={e=>handleVariantChange(i,'sku',e.target.value)} className="input-field p-1"/></td><td><input type="number" value={v.stock} onChange={e=>handleVariantChange(i,'stock',e.target.value)} className="input-field p-1 w-20"/></td></tr>)}</tbody></table></div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Tags */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="anime-card p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Tag className="h-6 w-6 text-primary-600" /> العلامات</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <input name="tagsAr" value={formData.tagsAr} onChange={handleChange} className="input-field" placeholder="علامات عربية (مفصولة بفاصلة)" />
                  <input name="tags" value={formData.tags} onChange={handleChange} className="input-field text-left" placeholder="English Tags (comma-separated)" />
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
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
                  <label className="flex items-center gap-2"><input type="checkbox" name="newArrival" checked={formData.newArrival} onChange={handleChange}/>وصل حديثاً</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="bestSeller" checked={formData.bestSeller} onChange={handleChange}/>الأكثر مبيعاً</label>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="anime-card p-6">
                <h3 className="text-xl font-bold mb-4">الإجراءات</h3>
                <button type="submit" disabled={isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                  {isSubmitting ? <div className="loading-spinner"></div> : <><Save />حفظ المنتج</>}
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
