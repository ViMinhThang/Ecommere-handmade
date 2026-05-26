'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { FlashSale, Category, Image, ImageFolder } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { mediaApi } from '@/lib/api/media'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Info, Plus, Trash2, X } from 'lucide-react'

type FlashSaleState = 'ACTIVE' | 'PAUSED' | 'ENDED'

interface FlashSaleRange {
  id?: string
  minPrice: number
  maxPrice: number
  discountPercent: number
  endDate: string
}

interface FlashSaleFormPayload {
  name: string
  description?: string
  banner?: string
  startAt: string
  endAt: string
  isActive: boolean
  saleState: FlashSaleState
  maxUnits?: number | null
  perUserLimit?: number | null
  reserveStock?: number
  autoPauseThreshold?: number | null
  categoryIds: string[]
  ranges: FlashSaleRange[]
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
  onSave: (data: FlashSaleFormPayload) => void
}

const formatDateTimeLocal = (date: Date | string) => {
  const d = new Date(date)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const optionalNumberToInput = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value)

const parseOptionalInteger = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return Number(trimmed)
}

const parseNullableInteger = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  return Number(trimmed)
}

export function FlashSaleDialog({
  open,
  onOpenChange,
  flashSale,
  categories,
  userId,
  isSaving,
  onSave,
}: FlashSaleDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startAt: '',
    endAt: '',
    isActive: true,
    saleState: 'ACTIVE' as FlashSaleState,
    maxUnits: '',
    perUserLimit: '',
    reserveStock: '',
    autoPauseThreshold: '',
  })
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [ranges, setRanges] = useState<FlashSaleRange[]>([])
  const [selectedBanner, setSelectedBanner] = useState<SelectedBanner | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [folders, setFolders] = useState<ImageFolder[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [bannerLoading, setBannerLoading] = useState(false)

  const isEdit = !!flashSale
  const soldUnits = flashSale?.soldUnits ?? 0
  const reservedUnits = flashSale?.reservedUnits ?? 0
  const maxUnitsValue = parseNullableInteger(formData.maxUnits)
  const remainingUnits =
    maxUnitsValue == null ? null : maxUnitsValue - soldUnits - reservedUnits

  useEffect(() => {
    if (!open || !userId) return

    mediaApi
      .getFolders(userId)
      .then((data) => {
        const folderData = data as ImageFolder[]
        setFolders(folderData)
        if (folderData.length > 0) {
          setSelectedFolderId(folderData[0].id)
        }
      })
      .catch(console.error)
  }, [open, userId])

  useEffect(() => {
    if (!selectedFolderId || !userId) return

    setBannerLoading(true)
    mediaApi
      .getImages(selectedFolderId)
      .then((data) => setImages(data as Image[]))
      .catch(console.error)
      .finally(() => setBannerLoading(false))
  }, [selectedFolderId, userId])

  useEffect(() => {
    if (!open) return

    if (flashSale) {
      setFormData({
        name: flashSale.name || '',
        description: flashSale.description || '',
        startAt: flashSale.startAt ? formatDateTimeLocal(flashSale.startAt) : '',
        endAt: flashSale.endAt ? formatDateTimeLocal(flashSale.endAt) : '',
        isActive: flashSale.isActive,
        saleState: flashSale.saleState || 'ACTIVE',
        maxUnits: optionalNumberToInput(flashSale.maxUnits),
        perUserLimit: optionalNumberToInput(flashSale.perUserLimit),
        reserveStock: optionalNumberToInput(flashSale.reserveStock),
        autoPauseThreshold: optionalNumberToInput(flashSale.autoPauseThreshold),
      })
      setSelectedCategoryIds(flashSale.categories.map((c) => c.categoryId))
      setRanges(
        flashSale.ranges.map((r) => ({
          id: r.id,
          minPrice: Number(r.minPrice),
          maxPrice: Number(r.maxPrice),
          discountPercent: Number(r.discountPercent),
          endDate: r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : '',
        })),
      )
      setSelectedBanner(
        flashSale.banner
          ? {
              id: '',
              path: flashSale.banner,
              displayName: 'Banner',
              url: mediaApi.getImageUrl(flashSale.banner),
            }
          : null,
      )
    } else {
      setFormData({
        name: '',
        description: '',
        startAt: '',
        endAt: '',
        isActive: true,
        saleState: 'ACTIVE',
        maxUnits: '',
        perUserLimit: '',
        reserveStock: '',
        autoPauseThreshold: '',
      })
      setSelectedCategoryIds([])
      setRanges([])
      setSelectedBanner(null)
    }
    setErrors([])
  }, [open, flashSale])

  const addRange = () => {
    setRanges([
      ...ranges,
      { minPrice: 0, maxPrice: 100000, discountPercent: 10, endDate: '' },
    ])
  }

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index))
  }

  const updateRange = (
    index: number,
    field: keyof FlashSaleRange,
    value: number | string,
  ) => {
    const newRanges = [...ranges]
    newRanges[index] = { ...newRanges[index], [field]: value }
    setRanges(newRanges)
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
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

  const validateGuardrails = (newErrors: string[]) => {
    const maxUnits = parseOptionalInteger(formData.maxUnits)
    const perUserLimit = parseOptionalInteger(formData.perUserLimit)
    const reserveStock = parseOptionalInteger(formData.reserveStock)
    const autoPauseThreshold = parseOptionalInteger(formData.autoPauseThreshold)

    if (maxUnits !== undefined && (!Number.isInteger(maxUnits) || maxUnits <= 0)) {
      newErrors.push('Tổng số lượng flash sale phải lớn hơn 0')
    }
    if (
      perUserLimit !== undefined &&
      (!Number.isInteger(perUserLimit) || perUserLimit <= 0)
    ) {
      newErrors.push('Giới hạn mỗi khách phải lớn hơn 0')
    }
    if (
      maxUnits !== undefined &&
      perUserLimit !== undefined &&
      perUserLimit > maxUnits
    ) {
      newErrors.push('Giới hạn mỗi khách không được lớn hơn tổng số lượng')
    }
    if (
      reserveStock !== undefined &&
      (!Number.isInteger(reserveStock) || reserveStock < 0)
    ) {
      newErrors.push('Tồn kho dự phòng phải lớn hơn hoặc bằng 0')
    }
    if (
      autoPauseThreshold !== undefined &&
      (!Number.isInteger(autoPauseThreshold) || autoPauseThreshold < 0)
    ) {
      newErrors.push('Ngưỡng tự tạm dừng phải lớn hơn hoặc bằng 0')
    }
    if (
      maxUnits !== undefined &&
      autoPauseThreshold !== undefined &&
      autoPauseThreshold > maxUnits
    ) {
      newErrors.push('Ngưỡng tự tạm dừng không được lớn hơn tổng số lượng')
    }
  }

  const validate = () => {
    const newErrors: string[] = []

    if (!formData.name.trim()) newErrors.push('Tên không được để trống')
    if (!formData.startAt) newErrors.push('Thời gian bắt đầu không được để trống')
    if (!formData.endAt) newErrors.push('Thời gian kết thúc không được để trống')
    if (
      formData.startAt &&
      formData.endAt &&
      new Date(formData.startAt) >= new Date(formData.endAt)
    ) {
      newErrors.push('Thời gian bắt đầu phải trước thời gian kết thúc')
    }
    if (selectedCategoryIds.length === 0) {
      newErrors.push('Vui lòng chọn ít nhất một danh mục')
    }
    if (ranges.length === 0) {
      newErrors.push('Vui lòng thêm ít nhất một khoảng giá')
    }

    ranges.forEach((range, index) => {
      if (Number(range.minPrice) >= Number(range.maxPrice)) {
        newErrors.push(
          `Khoảng ${index + 1}: Giá tối thiểu phải nhỏ hơn giá tối đa`,
        )
      }
      if (Number(range.discountPercent) < 0 || Number(range.discountPercent) > 100) {
        newErrors.push(`Khoảng ${index + 1}: Giảm giá phải từ 0 đến 100%`)
      }
      if (!range.endDate) {
        newErrors.push(`Khoảng ${index + 1}: Vui lòng chọn ngày kết thúc`)
      }
    })

    validateGuardrails(newErrors)
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const reserveStock = parseOptionalInteger(formData.reserveStock)

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      banner: selectedBanner?.path,
      startAt: formData.startAt,
      endAt: formData.endAt,
      isActive: formData.isActive,
      saleState: formData.saleState,
      maxUnits: parseNullableInteger(formData.maxUnits),
      perUserLimit: parseNullableInteger(formData.perUserLimit),
      reserveStock,
      autoPauseThreshold: parseNullableInteger(formData.autoPauseThreshold),
      categoryIds: selectedCategoryIds,
      ranges,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa flash sale' : 'Tạo flash sale mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 py-4">
            {errors.length > 0 && (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Vui lòng sửa các lỗi sau:
                  </span>
                </div>
                <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Guardrails chỉ có hiệu lực trong checkout khi backend bật{' '}
                  <code className="rounded bg-background/80 px-1 py-0.5">
                    FLASH_SALE_GUARDRAILS_ENABLED=true
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Tên flash sale</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Flash sale cuối tuần"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Mô tả ngắn về chương trình"
              />
            </div>

            <div className="grid gap-2">
              <Label>Ảnh banner</Label>
              {folders.length === 0 ? (
                <div className="rounded-md border bg-muted/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Chưa có thư mục ảnh. Vui lòng tải ảnh lên trang Media trước.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                  >
                    <option value="" disabled>
                      Chọn thư mục
                    </option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>

                  {bannerLoading ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Đang tải ảnh...
                    </div>
                  ) : images.length === 0 ? (
                    <div className="rounded-md border bg-muted/40 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Không có ảnh trong thư mục này
                      </p>
                    </div>
                  ) : (
                    <div className="grid max-h-[180px] grid-cols-6 gap-2 overflow-y-auto p-1">
                      {images.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          className={`relative overflow-hidden rounded-md border-2 transition ${
                            selectedBanner?.path === image.path
                              ? 'border-primary'
                              : 'border-transparent'
                          }`}
                          onClick={() => selectBanner(image)}
                        >
                          <img
                            src={mediaApi.getImageUrl(image.path)}
                            alt={image.displayName}
                            className="aspect-video h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedBanner && (
                    <div className="relative">
                      <img
                        src={mediaApi.getImageUrl(selectedBanner.path)}
                        alt={selectedBanner.displayName}
                        className="max-h-40 w-full rounded-md border object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-7 w-7"
                        onClick={() => setSelectedBanner(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startAt">Thời gian bắt đầu</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) =>
                    setFormData({ ...formData, startAt: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endAt">Thời gian kết thúc</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) =>
                    setFormData({ ...formData, endAt: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="saleState">Trạng thái chiến dịch</Label>
                <select
                  id="saleState"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.saleState}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      saleState: e.target.value as FlashSaleState,
                    })
                  }
                >
                  <option value="ACTIVE">ACTIVE - Đang chạy</option>
                  <option value="PAUSED">PAUSED - Tạm dừng</option>
                  <option value="ENDED">ENDED - Đã kết thúc</option>
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Kích hoạt</Label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Danh mục áp dụng</Label>
              <div className="flex max-h-[120px] flex-wrap gap-2 overflow-y-auto rounded-md border bg-muted/10 p-2">
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={
                      selectedCategoryIds.includes(category.id) ? 'default' : 'outline'
                    }
                    className="cursor-pointer select-none"
                    onClick={() => toggleCategory(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Guardrails số lượng</h3>
                <p className="text-xs text-muted-foreground">
                  Các trường này giúp kiểm soát oversell khi checkout guardrail được bật.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="maxUnits">Tổng số lượng flash sale</Label>
                  <Input
                    id="maxUnits"
                    type="number"
                    min={1}
                    value={formData.maxUnits}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUnits: e.target.value })
                    }
                    placeholder="Không giới hạn"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="perUserLimit">Giới hạn mỗi khách</Label>
                  <Input
                    id="perUserLimit"
                    type="number"
                    min={1}
                    value={formData.perUserLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, perUserLimit: e.target.value })
                    }
                    placeholder="Không giới hạn"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reserveStock">Tồn kho dự phòng</Label>
                  <Input
                    id="reserveStock"
                    type="number"
                    min={0}
                    value={formData.reserveStock}
                    onChange={(e) =>
                      setFormData({ ...formData, reserveStock: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="autoPauseThreshold">Ngưỡng tự tạm dừng</Label>
                  <Input
                    id="autoPauseThreshold"
                    type="number"
                    min={0}
                    value={formData.autoPauseThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoPauseThreshold: e.target.value,
                      })
                    }
                    placeholder="Chưa thiết lập"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-md bg-muted/40 p-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Đã bán</p>
                  <p className="text-lg font-semibold">{soldUnits}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Đang giữ</p>
                  <p className="text-lg font-semibold">{reservedUnits}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Còn lại</p>
                  <p className="text-lg font-semibold">
                    {remainingUnits == null ? 'Không giới hạn' : remainingUnits}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-base font-bold">Khoảng giá và giảm giá</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRange}>
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm khoảng
                </Button>
              </div>

              {ranges.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có khoảng giá nào.
                </p>
              )}

              <div className="space-y-3">
                {ranges.map((range, index) => (
                  <div key={index} className="space-y-3 rounded-md border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Khoảng {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRange(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối thiểu (VND)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={range.minPrice}
                          onChange={(e) =>
                            updateRange(index, 'minPrice', Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối đa (VND)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={range.maxPrice}
                          onChange={(e) =>
                            updateRange(index, 'maxPrice', Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giảm giá (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={range.discountPercent}
                          onChange={(e) =>
                            updateRange(index, 'discountPercent', Number(e.target.value))
                          }
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

                    <p className="border-t pt-2 text-xs italic text-muted-foreground">
                      Sản phẩm có giá từ {formatCurrency(range.minPrice)} đến{' '}
                      {formatCurrency(range.maxPrice)} sẽ được giảm{' '}
                      {range.discountPercent}%.
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
              {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo flash sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
