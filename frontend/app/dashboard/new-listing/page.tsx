'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCategories, useCreateProduct, useUpdateProduct, useProduct, useShippingProfiles } from '@/lib/api/hooks'
import { Category } from '@/types'
import { productsApi } from '@/lib/api/products'

// New Sub-components
import { ProductFormHeader } from '@/components/dashboard/product-form/product-form-header'
import { SidebarNav } from '@/components/dashboard/product-form/sidebar-nav'
import { BasicInfoSection } from '@/components/dashboard/product-form/basic-info-section'
import { MediaSection } from '@/components/dashboard/product-form/media-section'
import { PricingSection } from '@/components/dashboard/product-form/pricing-section'
import { InventorySection } from '@/components/dashboard/product-form/inventory-section'
import { PersonalizationSection } from '@/components/dashboard/product-form/personalization-section'
import { OptionsSection } from '@/components/dashboard/product-form/options-section'
import { ShippingSection } from '@/components/dashboard/product-form/shipping-section'

const SECTIONS = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'media', label: 'Hình ảnh' },
  { id: 'pricing', label: 'Giá & Khả dụng' },
  { id: 'inventory', label: 'Tồn kho' },
  { id: 'options', label: 'Tùy chọn' },
  { id: 'personalization', label: 'Cá nhân hóa' },
  { id: 'shipping', label: 'Vận chuyển' },
]

function NewListingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')

  const { data: categoriesData } = useCategories({ status: 'ACTIVE' })
  const { data: existingProduct } = useProduct(productId || '')
  const { data: shippingProfiles = [], isLoading: isShippingProfilesLoading } = useShippingProfiles()
  
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
    personalizationEnabled: false,
    personalizationRequired: false,
    personalizationInstructions: '',
    personalizationMaxLength: 120,
    optionColors: [] as string[],
    optionMaterials: [] as string[],
    optionSizes: [] as string[],
    processingTime: '',
    shippingProfileId: '',
  })

  const [isUploading, setIsUploading] = useState(false)

  // Load existing product data
  useEffect(() => {
    if (existingProduct) {
      setFormData({
        name: existingProduct.name || '',
        description: existingProduct.description || '',
        price: Number(existingProduct.price || 0),
        categoryId: existingProduct.categoryId || existingProduct.category?.id || '',
        images: existingProduct.images?.map(img => ({ url: img.url, isMain: img.isMain })) || [],
        descriptionImages: existingProduct.descriptionImages || [],
        stock: existingProduct.stock || 0,
        lowStockThreshold: existingProduct.lowStockThreshold || 0,
        sku: existingProduct.sku || '',
        status: existingProduct.status || 'PENDING',
        personalizationEnabled: Boolean(existingProduct.personalizationEnabled),
        personalizationRequired: Boolean(existingProduct.personalizationRequired),
        personalizationInstructions: existingProduct.personalizationInstructions || '',
        personalizationMaxLength: existingProduct.personalizationMaxLength || 120,
        optionColors: existingProduct.optionColors || [],
        optionMaterials: existingProduct.optionMaterials || [],
        optionSizes: existingProduct.optionSizes || [],
        processingTime: existingProduct.processingTime || '',
        shippingProfileId: existingProduct.shippingProfileId || '',
      })
    }
  }, [existingProduct])

  // Stable callbacks for child components to prevent unnecessary re-renders
  const handleInputChange = useCallback((field: keyof typeof formData, value: (typeof formData)[keyof typeof formData]) => {
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

    const personalizationMaxLength = Number(formData.personalizationMaxLength) || 120
    if (formData.personalizationEnabled && (personalizationMaxLength < 1 || personalizationMaxLength > 500)) {
      alert('Giới hạn ký tự cá nhân hóa phải từ 1 đến 500')
      document.getElementById('personalization')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (formData.personalizationInstructions.length > 1000) {
      alert('Hướng dẫn cá nhân hóa không được vượt quá 1000 ký tự')
      document.getElementById('personalization')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    const optionLists = [
      { label: 'Màu sắc', value: formData.optionColors },
      { label: 'Chất liệu', value: formData.optionMaterials },
      { label: 'Kích thước', value: formData.optionSizes },
    ]
    const invalidOptionList = optionLists.find(
      (list) =>
        list.value.length > 20 ||
        list.value.some((item) => item.trim().length > 40),
    )

    if (invalidOptionList) {
      alert(`${invalidOptionList.label} tối đa 20 lựa chọn, mỗi lựa chọn tối đa 40 ký tự`)
      document.getElementById('options')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (formData.processingTime.length > 120) {
      alert('Thời gian làm không được vượt quá 120 ký tự')
      document.getElementById('options')?.scrollIntoView({ behavior: 'smooth' })
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
      personalizationEnabled: formData.personalizationEnabled,
      personalizationRequired: formData.personalizationEnabled
        ? formData.personalizationRequired
        : false,
      personalizationInstructions: formData.personalizationEnabled
        ? formData.personalizationInstructions.trim() || undefined
        : undefined,
      personalizationMaxLength: formData.personalizationEnabled
        ? personalizationMaxLength
        : 120,
      optionColors: formData.optionColors,
      optionMaterials: formData.optionMaterials,
      optionSizes: formData.optionSizes,
      processingTime: formData.processingTime.trim() || null,
      shippingProfileId: formData.shippingProfileId || null,
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

          <OptionsSection
            optionColors={formData.optionColors}
            optionMaterials={formData.optionMaterials}
            optionSizes={formData.optionSizes}
            processingTime={formData.processingTime}
            onChange={handleInputChange}
          />

          <PersonalizationSection
            personalizationEnabled={formData.personalizationEnabled}
            personalizationRequired={formData.personalizationRequired}
            personalizationInstructions={formData.personalizationInstructions}
            personalizationMaxLength={formData.personalizationMaxLength}
            onChange={handleInputChange}
          />

          <ShippingSection
            shippingProfileId={formData.shippingProfileId}
            shippingProfiles={shippingProfiles}
            isLoading={isShippingProfilesLoading}
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
    <Suspense fallback={<div className="min-h-screen bg-[#fdf9f3] flex items-center justify-center dark:bg-background">Đang tải...</div>}>
      <NewListingContent />
    </Suspense>
  )
}
