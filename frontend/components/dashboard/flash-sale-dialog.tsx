'use client'

import { useState, useEffect } from 'react'
import { FlashSale, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, AlertCircle, X } from 'lucide-react'
import { mediaApi } from '@/lib/api/media'
import { ImageFolder, Image } from '@/types'

interface FlashSaleRange {
  id?: string
  minPrice: number
  maxPrice: number
  discountPercent: number
  endDate: string
}

interface SelectedBanner {
  id: string
  path: string
  displayName: string
  url: string
}

interface FlashSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flashSale?: FlashSale | null
  categories: Category[]
  userId: string
  isSaving?: boolean
  onSave: (data: {
    name: string
    description?: string
    banner?: string
    startAt: string
    endAt: string
    isActive: boolean
    categoryIds: string[]
    ranges: FlashSaleRange[]
  }) => void
}

export function FlashSaleDialog({ open, onOpenChange, flashSale, categories, userId, isSaving, onSave }: FlashSaleDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startAt: '',
    endAt: '',
    isActive: true,
  })

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [ranges, setRanges] = useState<FlashSaleRange[]>([])
  const [selectedBanner, setSelectedBanner] = useState<SelectedBanner | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const [folders, setFolders] = useState<ImageFolder[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [bannerLoading, setBannerLoading] = useState(false)

  const isEdit = !!flashSale

  useEffect(() => {
    if (open && userId) {
      mediaApi.getFolders(userId).then((data) => {
        setFolders(data as ImageFolder[])
        if ((data as ImageFolder[]).length > 0) {
          setSelectedFolderId((data as ImageFolder[])[0].id)
        }
      }).catch(console.error)
    }
  }, [open, userId])

  useEffect(() => {
    if (selectedFolderId && userId) {
      setBannerLoading(true)
      mediaApi.getImages(selectedFolderId).then((data) => {
        setImages(data as Image[])
      }).catch(console.error).finally(() => setBannerLoading(false))
    }
  }, [selectedFolderId, userId])

  useEffect(() => {
    if (open) {
      if (flashSale) {
        setFormData({
          name: flashSale.name || '',
          description: flashSale.description || '',
          startAt: flashSale.startAt ? formatDateTimeLocal(flashSale.startAt) : '',
          endAt: flashSale.endAt ? formatDateTimeLocal(flashSale.endAt) : '',
          isActive: flashSale.isActive,
        })
        setSelectedCategoryIds(flashSale.categories.map((c) => c.categoryId))
        setRanges(
          flashSale.ranges.map((r) => ({
            id: r.id,
            minPrice: Number(r.minPrice),
            maxPrice: Number(r.maxPrice),
            discountPercent: Number(r.discountPercent),
            endDate: r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : '',
          }))
        )
        if (flashSale.banner) {
          setSelectedBanner({
            id: '',
            path: flashSale.banner,
            displayName: 'Banner',
            url: mediaApi.getImageUrl(flashSale.banner),
          })
        } else {
          setSelectedBanner(null)
        }
      } else {
        setFormData({ name: '', description: '', startAt: '', endAt: '', isActive: true })
        setSelectedCategoryIds([])
        setRanges([])
        setSelectedBanner(null)
      }
      setErrors([])
    }
  }, [open, flashSale])

  const formatDateTimeLocal = (date: Date | string) => {
    const d = new Date(date)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  const addRange = () => {
    setRanges([...ranges, { minPrice: 0, maxPrice: 100000, discountPercent: 10, endDate: '' }])
  }

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index))
  }

  const updateRange = (index: number, field: keyof FlashSaleRange, value: number | string) => {
    const newRanges = [...ranges]
    newRanges[index] = { ...newRanges[index], [field]: value }
    setRanges(newRanges)
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const selectBanner = (image: Image) => {
    setSelectedBanner({
      id: image.id,
      path: image.path,
      displayName: image.displayName,
      url: mediaApi.getImageUrl(image.path),
    })
  }

  const clearBanner = () => {
    setSelectedBanner(null)
  }

  const validate = (): boolean => {
    const newErrors: string[] = []

    if (!formData.name.trim()) newErrors.push('Tên không được để trống')
    if (!formData.startAt) newErrors.push('Thời gian bắt đầu không được để trống')
    if (!formData.endAt) newErrors.push('Thời gian kết thúc không được để trống')
    if (formData.startAt && formData.endAt && new Date(formData.startAt) >= new Date(formData.endAt)) {
      newErrors.push('Thời gian bắt đầu phải trước thời gian kết thúc')
    }
    if (selectedCategoryIds.length === 0) newErrors.push('Vui lòng chọn ít nhất một danh mục')
    if (ranges.length === 0) newErrors.push('Vui lòng thêm ít nhất một khoảng giá')

    ranges.forEach((range, index) => {
      if (Number(range.minPrice) >= Number(range.maxPrice)) {
        newErrors.push(`Khoảng ${index + 1}: Giá tối thiểu phải nhỏ hơn giá tối đa`)
      }
      if (Number(range.discountPercent) < 0 || Number(range.discountPercent) > 100) {
        newErrors.push(`Khoảng ${index + 1}: Giảm giá phải từ 0 đến 100%`)
      }
      if (!range.endDate) {
        newErrors.push(`Khoảng ${index + 1}: Vui lòng chọn ngày kết thúc`)
      }
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSave({
      ...formData,
      banner: selectedBanner?.path,
      categoryIds: selectedCategoryIds,
      ranges,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa Flash Sale' : 'Tạo Flash Sale mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Vui lòng sửa các lỗi sau:</span>
                </div>
                <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Tên Flash Sale</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Flash Sale Cuối Tuần"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về chương trình này..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Ảnh Banner</Label>
              {folders.length === 0 ? (
                <div className="text-center py-6 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Chưa có thư mục ảnh. Vui lòng tải ảnh lên trang Media trước.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <select
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                    >
                      <option value="" disabled>Chọn thư mục</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bannerLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Đang tải ảnh...</div>
                  ) : images.length === 0 ? (
                    <div className="text-center py-6 p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Không có ảnh trong thư mục này</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-2 max-h-[180px] overflow-y-auto p-1">
                      {images.map((image) => (
                        <div
                          key={image.id}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            selectedBanner?.path === image.path ? 'border-primary' : 'border-transparent'
                          }`}
                          onClick={() => selectBanner(image)}
                        >
                          <div className="aspect-video">
                            <img
                              src={mediaApi.getImageUrl(image.path)}
                              alt={image.displayName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {selectedBanner?.path === image.path && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedBanner && (
                    <div className="relative inline-block w-full">
                      <img
                        src={selectedBanner.url}
                        alt={selectedBanner.displayName}
                        className="w-full max-h-40 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={clearBanner}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startAt">Thời gian bắt đầu</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endAt">Thời gian kết thúc</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Danh mục áp dụng</Label>
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 border rounded-lg bg-muted/10">
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategoryIds.includes(cat.id) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
              {selectedCategoryIds.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-yellow-600">Nhấp chọn các danh mục áp dụng</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Hoạt động</Label>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-bold">Khoảng giá & Giảm giá</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRange}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm khoảng
                </Button>
              </div>

              {ranges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có khoảng giá nào được thêm.
                </p>
              )}

              <div className="space-y-3">
                {ranges.map((range, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Khoảng {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRange(index)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối thiểu (VND)</Label>
                        <Input
                          type="number"
                          value={range.minPrice}
                          onChange={(e) => updateRange(index, 'minPrice', Number(e.target.value))}
                          min={0}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối đa (VND)</Label>
                        <Input
                          type="number"
                          value={range.maxPrice}
                          onChange={(e) => updateRange(index, 'maxPrice', Number(e.target.value))}
                          min={0}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giảm giá (%)</Label>
                        <Input
                          type="number"
                          value={range.discountPercent}
                          onChange={(e) => updateRange(index, 'discountPercent', Number(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Ngày kết thúc khoảng</Label>
                        <Input
                          type="date"
                          value={range.endDate}
                          onChange={(e) => updateRange(index, 'endDate', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                      Các sản phẩm có giá từ {formatCurrency(range.minPrice)} đến {formatCurrency(range.maxPrice)} sẽ được giảm {range.discountPercent}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isEdit ? 'Lưu thay đổi' : 'Tạo Flash Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
