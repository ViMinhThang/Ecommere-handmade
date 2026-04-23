'use client'

import { useState, useEffect } from 'react'
import { Category, CategoryStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ImageSelector } from './image-selector'

interface SelectedImage {
  id: string
  path: string
  displayName: string
  url: string
}

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  userId: string
  onSave: (category: Partial<Category>) => void
}

export function CategoryDialog({ open, onOpenChange, category, userId, onSave }: CategoryDialogProps) {
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    description: '',
    slug: '',
    image: '',
    status: 'ACTIVE',
  })

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)

  const isEdit = !!category

  useEffect(() => {
    if (open) {
      if (category) {
        setFormData({
          name: category.name || '',
          description: category.description || '',
          slug: category.slug || '',
          image: category.image || '',
          status: category.status || 'ACTIVE',
        })
        if (category.image) {
          setSelectedImage({
            id: '',
            path: category.image,
            displayName: 'Hình ảnh danh mục',
            url: category.image,
          })
        } else {
          setSelectedImage(null)
        }
      } else {
        setFormData({
          name: '',
          description: '',
          slug: '',
          image: '',
          status: 'ACTIVE',
        })
        setSelectedImage(null)
      }
    }
  }, [open, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      image: selectedImage?.url || '',
    })
    onOpenChange(false)
  }

  const handleSelectionChange = (images: SelectedImage[]) => {
    setSelectedImage(images[0] || null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên danh mục</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Gốm sứ"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Đường dẫn (Slug)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="VD: gom-su (để trống để tự tạo)"
              />
            </div>
            <div className="grid gap-2">
              <Label>Hình ảnh danh mục</Label>
              <ImageSelector
                userId={userId}
                selectedImages={selectedImage ? [selectedImage] : []}
                onSelectionChange={handleSelectionChange}
                mode="single"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về danh mục này..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Trạng thái</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as CategoryStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái">
                    {formData.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">{isEdit ? 'Lưu thay đổi' : 'Thêm danh mục'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryName: string
  onConfirm: () => void
}

export function DeleteCategoryDialog({ open, onOpenChange, categoryName, onConfirm }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Xóa danh mục</DialogTitle>
        </DialogHeader>
        <p className="py-4">
          Bạn có chắc chắn muốn xóa danh mục <span className="font-semibold">{categoryName}</span>? Hành động này không thể hoàn tác.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
