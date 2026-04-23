'use client'

import { useState, useEffect } from 'react'
import { Product, Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ImageSelector } from './image-selector'

interface ProductImageInput {
  url: string
  isMain: boolean
}

interface SelectedImage {
  id: string
  path: string
  displayName: string
  url: string
  isMain?: boolean
}

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: Category[]
  sellerId: string
  onSave: (product: { name: string; description: string; price: number; categoryId: string; images: ProductImageInput[]; stock: number; lowStockThreshold: number; sku?: string }) => void
}

export function ProductDialog({ open, onOpenChange, product, categories, sellerId, onSave }: ProductDialogProps) {
  const [formData, setFormData] = useState<{
    name: string
    description: string
    price: number
    categoryId: string
    images: ProductImageInput[]
    stock: number
    lowStockThreshold: number
    sku: string
  }>({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    images: [],
    stock: 0,
    lowStockThreshold: 10,
    sku: '',
  })

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])

  const isEdit = !!product

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: Number(product.price),
        categoryId: product.categoryId,
        images: product.images?.length 
          ? product.images.map(img => ({ url: img.url, isMain: img.isMain }))
          : [],
        stock: product.stock || 0,
        lowStockThreshold: product.lowStockThreshold || 10,
        sku: product.sku || '',
      })
      setSelectedImages(
        product.images?.length 
          ? product.images.map(img => ({ 
              id: img.id, 
              path: img.url, 
              displayName: 'Hình ảnh sản phẩm', 
              url: img.url, 
              isMain: img.isMain 
            }))
          : []
      )
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        images: [],
        stock: 0,
        lowStockThreshold: 10,
        sku: '',
      })
      setSelectedImages([])
    }
  }, [product, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validImages = selectedImages
      .filter(img => img.url !== '')
      .map((img, index) => ({
        url: img.url,
        isMain: index === 0 ? true : (img.isMain || false),
      }))
    
    if (validImages.length > 0) {
      validImages[0].isMain = true
      selectedImages.forEach((img, idx) => {
        if (img.isMain) {
          validImages[idx].isMain = true
          validImages.forEach((v, i) => {
            if (i !== idx) v.isMain = false
          })
        }
      })
    }

    if (validImages.length === 0) {
      validImages.push({ url: 'https://placehold.co/400x400', isMain: true })
    }
    onSave({
      name: formData.name,
      description: formData.description,
      price: formData.price,
      categoryId: formData.categoryId,
      images: validImages,
      stock: formData.stock,
      lowStockThreshold: formData.lowStockThreshold,
      sku: formData.sku || undefined,
    })
    onOpenChange(false)
  }

  const handleSelectionChange = (images: SelectedImage[]) => {
    setSelectedImages(images)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên sản phẩm *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên sản phẩm"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả sản phẩm của bạn..."
                rows={3}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Giá *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Danh mục *</Label>
              <Select
                value={formData.categoryId || ''}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value as string })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục">
                    {categories.find(c => c.id === formData.categoryId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(c => c.status === 'ACTIVE')
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">Tồn kho *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lowStock">Ngưỡng báo thấp</Label>
                <Input
                  id="lowStock"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">Mã SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Hình ảnh sản phẩm</Label>
              <ImageSelector
                userId={sellerId}
                selectedImages={selectedImages}
                onSelectionChange={handleSelectionChange}
                mode="multiple"
              />
            </div>

            {selectedImages.length > 0 && (
              <div className="grid gap-2">
                <Label>Xem trước</Label>
                <div className="flex gap-2 flex-wrap">
                  {selectedImages
                    .map((img, idx) => (
                      <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                        <img src={img.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        {img.isMain && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                            Chính
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={!formData.name || !formData.description || !formData.price || !formData.categoryId}>
              {isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
