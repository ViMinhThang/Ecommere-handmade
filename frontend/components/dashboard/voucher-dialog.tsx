'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react'
import { Voucher, Category, User } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

interface VoucherRange {
  id?: string
  minPrice: number
  maxPrice: number
  discountPercent: number
  endDate: string
}

export interface VoucherDialogSavePayload {
  name: string
  description?: string
  code: string
  categoryId: string
  sellerId?: string | null
  isActive: boolean
  endDate: string
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  perUserLimit?: number | null
  ranges: VoucherRange[]
}

interface VoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher?: Voucher | null
  categories: Category[]
  sellers?: User[]
  onSave: (voucher: VoucherDialogSavePayload) => void
}

const PLATFORM_VALUE = 'platform'

export function VoucherDialog({
  open,
  onOpenChange,
  voucher,
  categories,
  sellers = [],
  onSave,
}: VoucherDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    categoryId: '',
    sellerId: PLATFORM_VALUE,
    isActive: true,
    endDate: '',
    maxDiscountAmount: '',
    usageLimit: '',
    perUserLimit: '',
  })

  const [ranges, setRanges] = useState<VoucherRange[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const isEdit = !!voucher

  useEffect(() => {
    if (!open) return

    if (voucher) {
      setFormData({
        name: voucher.name || '',
        description: voucher.description || '',
        code: voucher.code || '',
        categoryId: voucher.categoryId || '',
        sellerId: voucher.sellerId || PLATFORM_VALUE,
        isActive: voucher.isActive,
        endDate: voucher.endDate
          ? new Date(voucher.endDate).toISOString().split('T')[0]
          : '',
        maxDiscountAmount:
          voucher.maxDiscountAmount != null
            ? String(voucher.maxDiscountAmount)
            : '',
        usageLimit:
          voucher.usageLimit != null ? String(voucher.usageLimit) : '',
        perUserLimit:
          voucher.perUserLimit != null ? String(voucher.perUserLimit) : '',
      })
      setRanges(
        voucher.ranges.map((range) => ({
          id: range.id,
          minPrice: Number(range.minPrice),
          maxPrice: Number(range.maxPrice),
          discountPercent: Number(range.discountPercent),
          endDate: range.endDate
            ? new Date(range.endDate).toISOString().split('T')[0]
            : '',
        })),
      )
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        categoryId: '',
        sellerId: PLATFORM_VALUE,
        isActive: true,
        endDate: '',
        maxDiscountAmount: '',
        usageLimit: '',
        perUserLimit: '',
      })
      setRanges([])
    }

    setErrors([])
  }, [open, voucher])

  const addRange = () => {
    setRanges([
      ...ranges,
      {
        minPrice: 0,
        maxPrice: 100000,
        discountPercent: 10,
        endDate: '',
      },
    ])
  }

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, rangeIndex) => rangeIndex !== index))
  }

  const updateRange = (
    index: number,
    field: keyof VoucherRange,
    value: number | string,
  ) => {
    const nextRanges = [...ranges]
    nextRanges[index] = { ...nextRanges[index], [field]: value }
    setRanges(nextRanges)
  }

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim()
    return trimmed === '' ? null : Number(trimmed)
  }

  const validate = (): boolean => {
    const nextErrors: string[] = []

    if (!formData.name.trim()) nextErrors.push('Tên không được để trống')
    if (!formData.code.trim()) nextErrors.push('Mã không được để trống')
    if (!formData.categoryId) nextErrors.push('Danh mục không được để trống')
    if (!formData.endDate) {
      nextErrors.push('Ngày kết thúc không được để trống')
    }

    const maxDiscountAmount = parseOptionalNumber(formData.maxDiscountAmount)
    const usageLimit = parseOptionalNumber(formData.usageLimit)
    const perUserLimit = parseOptionalNumber(formData.perUserLimit)

    if (
      maxDiscountAmount != null &&
      (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)
    ) {
      nextErrors.push('Mức giảm tối đa phải là số không âm')
    }
    if (
      usageLimit != null &&
      (!Number.isInteger(usageLimit) || usageLimit <= 0)
    ) {
      nextErrors.push('Tổng lượt dùng phải là số nguyên lớn hơn 0')
    }
    if (
      perUserLimit != null &&
      (!Number.isInteger(perUserLimit) || perUserLimit <= 0)
    ) {
      nextErrors.push('Lượt dùng mỗi khách phải là số nguyên lớn hơn 0')
    }

    if (ranges.length === 0) {
      nextErrors.push('Vui lòng thêm ít nhất một khoảng giá')
    }

    ranges.forEach((range, index) => {
      if (range.minPrice >= range.maxPrice) {
        nextErrors.push(
          `Khoảng ${index + 1}: Giá tối thiểu phải nhỏ hơn giá tối đa`,
        )
      }
      if (range.discountPercent < 0 || range.discountPercent > 100) {
        nextErrors.push(`Khoảng ${index + 1}: Giảm giá phải từ 0 đến 100%`)
      }
      if (!range.endDate) {
        nextErrors.push(`Khoảng ${index + 1}: Vui lòng chọn ngày kết thúc`)
      }
    })

    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const { maxDiscountAmount, usageLimit, perUserLimit, ...baseFormData } =
      formData

    onSave({
      ...baseFormData,
      sellerId:
        sellers.length > 0 && baseFormData.sellerId !== PLATFORM_VALUE
          ? baseFormData.sellerId
          : null,
      maxDiscountAmount: parseOptionalNumber(maxDiscountAmount),
      usageLimit: parseOptionalNumber(usageLimit),
      perUserLimit: parseOptionalNumber(perUserLimit),
      ranges,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa voucher' : 'Tạo voucher mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {errors.length > 0 ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Vui lòng sửa các lỗi sau:
                  </span>
                </div>
                <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên voucher</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder="VD: Giảm giá mùa hè"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Mã voucher</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                  placeholder="VD: SUMMER2024"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    description: event.target.value,
                  })
                }
                placeholder="Mô tả về voucher này..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value || '' })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Chọn danh mục">
                      {categories.find((category) => category.id === formData.categoryId)
                        ?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Ngày kết thúc voucher</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(event) =>
                    setFormData({ ...formData, endDate: event.target.value })
                  }
                  required
                />
              </div>
            </div>

            {sellers.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="sellerId">Phạm vi áp dụng</Label>
                <Select
                  value={formData.sellerId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      sellerId: value || PLATFORM_VALUE,
                    })
                  }
                >
                  <SelectTrigger id="sellerId">
                    <SelectValue placeholder="Chọn phạm vi voucher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLATFORM_VALUE}>Voucher sàn</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        Voucher shop - {seller.shopName || seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Voucher shop chỉ áp dụng cho sản phẩm và đơn thiết kế riêng
                  của seller đã chọn.
                </p>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Hoạt động</Label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="maxDiscountAmount">
                  Mức giảm tối đa (VND)
                </Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  min={0}
                  value={formData.maxDiscountAmount}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      maxDiscountAmount: event.target.value,
                    })
                  }
                  placeholder="Bỏ trống nếu không giới hạn"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usageLimit">Tổng lượt dùng</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.usageLimit}
                  onChange={(event) =>
                    setFormData({ ...formData, usageLimit: event.target.value })
                  }
                  placeholder="Không giới hạn"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="perUserLimit">Lượt dùng mỗi khách</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.perUserLimit}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      perUserLimit: event.target.value,
                    })
                  }
                  placeholder="Không giới hạn"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-base">Khoảng giá</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRange}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm khoảng giá
                </Button>
              </div>

              {ranges.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có khoảng giá nào được thêm. Nhấn &quot;Thêm khoảng giá&quot; để
                  tạo.
                </p>
              ) : null}

              <div className="space-y-3">
                {ranges.map((range, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Khoảng {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRange(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối thiểu (VND)</Label>
                        <Input
                          type="number"
                          value={range.minPrice}
                          onChange={(event) =>
                            updateRange(
                              index,
                              'minPrice',
                              Number(event.target.value),
                            )
                          }
                          min={0}
                          placeholder="0"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối đa (VND)</Label>
                        <Input
                          type="number"
                          value={range.maxPrice}
                          onChange={(event) =>
                            updateRange(
                              index,
                              'maxPrice',
                              Number(event.target.value),
                            )
                          }
                          min={0}
                          placeholder="100000"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giảm giá (%)</Label>
                        <Input
                          type="number"
                          value={range.discountPercent}
                          onChange={(event) =>
                            updateRange(
                              index,
                              'discountPercent',
                              Number(event.target.value),
                            )
                          }
                          min={0}
                          max={100}
                          placeholder="10"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">
                          Ngày kết thúc khoảng giá
                        </Label>
                        <Input
                          type="date"
                          value={range.endDate}
                          onChange={(event) =>
                            updateRange(index, 'endDate', event.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Sản phẩm có giá từ {formatCurrency(range.minPrice)} đến{' '}
                      {formatCurrency(range.maxPrice)} sẽ được giảm{' '}
                      {range.discountPercent}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit">
              {isEdit ? 'Lưu thay đổi' : 'Tạo voucher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
