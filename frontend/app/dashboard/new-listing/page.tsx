'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCategories, useCreateProduct, useUpdateProduct, useProduct } from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { Category } from '@/types'
import { productsApi } from '@/lib/api/products'

// New Sub-components
import { ProductFormHeader } from '@/components/dashboard/product-form/product-form-header'
import { SidebarNav } from '@/components/dashboard/product-form/sidebar-nav'
import { BasicInfoSection } from '@/components/dashboard/product-form/basic-info-section'
import { MediaSection } from '@/components/dashboard/product-form/media-section'
import { PricingSection } from '@/components/dashboard/product-form/pricing-section'
import { InventorySection } from '@/components/dashboard/product-form/inventory-section'

const SECTIONS = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'media', label: 'Hình ảnh' },
  { id: 'pricing', label: 'Giá & Khả dụng' },
  { id: 'inventory', label: 'Tồn kho' },
]

function NewListingContent() {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')

  const { data: categoriesData } = useCategories({ status: 'ACTIVE' })
  const { data: existingProduct } = useProduct(productId || '')
  
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const categories = (categoriesData?.data as Category[]) || []

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 245,
    categoryId: '',
    images: [] as { url: string; isMain: boolean }[],
    descriptionImages: [] as string[],
    stock: 1,
    lowStockThreshold: 5,
    sku: '',
    status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED',
  })

  const [isUploading, setIsUploading] = useState(false)

  // Load existing product data
  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name || '',
        description: existingProduct.description || '',
        price: existingProduct.price || 0,
        categoryId: existingProduct.categoryId || (existingProduct as any).category?.id || '',
        images: existingProduct.images?.map(img => ({ url: img.url, isMain: img.isMain })) || [],
        descriptionImages: existingProduct.descriptionImages || [],
        stock: existingProduct.stock || 0,
        lowStockThreshold: existingProduct.lowStockThreshold || 0,
        sku: existingProduct.sku || '',
        status: existingProduct.status || 'PENDING',
      })
    }
  }, [existingProduct])

  // Stable callbacks for child components to prevent unnecessary re-renders
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleFileUpload = useCallback(async (file: File, type: 'GALLERY' | 'DESCRIPTION') => {
    try {
      setIsUploading(true)
      const res = await productsApi.uploadImage(file)
      const url = res.url
      
      if (type === 'GALLERY') {
        setFormData(prev => ({ 
          ...prev, 
          images: [...prev.images, { url, isMain: prev.images.length === 0 }] 
        }))
      } else {
        setFormData(prev => ({ 
          ...prev, 
          descriptionImages: [...prev.descriptionImages, url] 
        }))
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Tải ảnh lên thất bại. Vui lòng thử lại.')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleRemoveImage = useCallback((index: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index)
      if (newImages.length > 0 && !newImages.some(img => img.isMain)) {
        newImages[0].isMain = true
      }
      return { ...prev, images: newImages }
    })
  }, [])

  const handleRemoveDescriptionImage = useCallback((index: number) => {
    setFormData(prev => ({
        ...prev,
        descriptionImages: prev.descriptionImages.filter((_, i) => i !== index)
    }))
  }, [])

  const handleSetMainImage = useCallback((index: number) => {
    setFormData(prev => ({
        ...prev,
        images: prev.images.map((img, i) => ({ ...img, isMain: i === index }))
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.categoryId) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc (Tên và Danh mục)')
      document.getElementById('basic')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (formData.images.length === 0) {
      alert('Vui lòng thêm ít nhất một hình ảnh sản phẩm')
      document.getElementById('media')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (formData.price <= 0) {
      alert('Giá sản phẩm phải lớn hơn 0')
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    const productData = {
      name: formData.name,
      description: formData.description,
      price: Number(formData.price),
      categoryId: formData.categoryId,
      images: formData.images,
      descriptionImages: formData.descriptionImages,
      stock: Number(formData.stock),
      lowStockThreshold: Number(formData.lowStockThreshold),
      sku: formData.sku,
    }

    if (productId && existingProduct) {
      updateProduct.mutate({
        id: productId,
        data: productData,
      }, {
        onSuccess: () => {
          alert('Cập nhật sản phẩm thành công!')
          router.push('/dashboard/products')
        },
        onSettled: () => setIsSubmitting(false)
      })
    } else {
      createProduct.mutate(productData, {
        onSuccess: () => {
          alert('Tạo sản phẩm thành công!')
          router.push('/dashboard/products')
        },
        onSettled: () => setIsSubmitting(false)
      })
    }
  }, [formData, productId, existingProduct, updateProduct, createProduct, router])

  return (
    <div className="relative">
      {/* Sticky Action Bar */}
      <ProductFormHeader 
        productId={productId}
        isSubmitting={isSubmitting}
        status={formData.status}
        categoryId={formData.categoryId}
        categories={categories}
        onSubmit={handleSubmit}
      />

      <div className="mx-auto max-w-5xl flex flex-col lg:flex-row gap-10">
        {/* Form Column */}
        <div className="flex-1 space-y-10">
          <BasicInfoSection 
            name={formData.name}
            description={formData.description}
            categoryId={formData.categoryId}
            categories={categories}
            onChange={handleInputChange}
          />

          <MediaSection 
            images={formData.images}
            descriptionImages={formData.descriptionImages}
            isUploading={isUploading}
            onAddImage={(file) => handleFileUpload(file, 'GALLERY')}
            onAddDescriptionImage={(file) => handleFileUpload(file, 'DESCRIPTION')}
            onRemoveImage={handleRemoveImage}
            onRemoveDescriptionImage={handleRemoveDescriptionImage}
            onSetMainImage={handleSetMainImage}
          />

          <PricingSection 
            price={formData.price}
            sku={formData.sku}
            onChange={handleInputChange}
          />

          <InventorySection 
            stock={formData.stock}
            onChange={handleInputChange}
          />
        </div>

        {/* Sticky Sidebar Nav */}
        <SidebarNav sections={SECTIONS} />
      </div>
    </div>
  )
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf9f3] flex items-center justify-center">Đang tải...</div>}>
      <NewListingContent />
    </Suspense>
  )
}