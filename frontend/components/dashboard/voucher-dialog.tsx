'use client'

import { useState, useEffect } from 'react'
import { Voucher, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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

interface VoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher?: Voucher | null
  categories: Category[]
  onSave: (voucher: {
    name: string
    description?: string
    code: string
    categoryId: string
    isActive: boolean
    endDate: string
    ranges: VoucherRange[]
  }) => void
}

export function VoucherDialog({ open, onOpenChange, voucher, categories, onSave }: VoucherDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    categoryId: '',
    isActive: true,
    endDate: '',
  })

  const [ranges, setRanges] = useState<VoucherRange[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const isEdit = !!voucher

  useEffect(() => {
    if (open) {
      if (voucher) {
        setFormData({
          name: voucher.name || '',
          description: voucher.description || '',
          code: voucher.code || '',
          categoryId: voucher.categoryId || '',
          isActive: voucher.isActive,
          endDate: voucher.endDate ? new Date(voucher.endDate).toISOString().split('T')[0] : '',
        })
        setRanges(
          voucher.ranges.map((r) => ({
            id: r.id,
            minPrice: Number(r.minPrice),
            maxPrice: Number(r.maxPrice),
            discountPercent: Number(r.discountPercent),
            endDate: r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : '',
          }))
        )
      } else {
        setFormData({
          name: '',
          description: '',
          code: '',
          categoryId: '',
          isActive: true,
          endDate: '',
        })
        setRanges([])
      }
      setErrors([])
    }
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
    setRanges(ranges.filter((_, i) => i !== index))
  }

  const updateRange = (index: number, field: keyof VoucherRange, value: number | string) => {
    const newRanges = [...ranges]
    newRanges[index] = { ...newRanges[index], [field]: value }
    setRanges(newRanges)
  }

  const validate = (): boolean => {
    const newErrors: string[] = []

    if (!formData.name.trim()) newErrors.push('Tên không được để trống')
    if (!formData.code.trim()) newErrors.push('Mã không được để trống')
    if (!formData.categoryId) newErrors.push('Danh mục không được để trống')
    if (!formData.endDate) newErrors.push('Ngày kết thúc không được để trống')

    if (ranges.length === 0) {
      newErrors.push('Vui lòng thêm ít nhất một khoảng giá')
    }

    ranges.forEach((range, index) => {
      if (range.minPrice >= range.maxPrice) {
        newErrors.push(`Khoảng ${index + 1}: Giá tối thiểu phải nhỏ hơn giá tối đa`)
      }
      if (range.discountPercent < 0 || range.discountPercent > 100) {
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
      ranges,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa Voucher' : 'Tạo Voucher mới'}</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên Voucher</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Giảm giá mùa hè"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Mã Voucher</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về voucher này..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục">
                      {categories.find(c => c.id === formData.categoryId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Ngày kết thúc Voucher</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
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
                <Label className="text-base">Khoảng giá</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRange}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm khoảng giá
                </Button>
              </div>

              {ranges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có khoảng giá nào được thêm. Nhấn "Thêm khoảng giá" để tạo.
                </p>
              )}

              <div className="space-y-3">
                {ranges.map((range, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối thiểu (VND)</Label>
                        <Input
                          type="number"
                          value={range.minPrice}
                          onChange={(e) => updateRange(index, 'minPrice', Number(e.target.value))}
                          min={0}
                          placeholder="0"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Giá tối đa (VND)</Label>
                        <Input
                          type="number"
                          value={range.maxPrice}
                          onChange={(e) => updateRange(index, 'maxPrice', Number(e.target.value))}
                          min={0}
                          placeholder="100000"
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
                          placeholder="10"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Ngày kết thúc khoảng giá</Label>
                        <Input
                          type="date"
                          value={range.endDate}
                          onChange={(e) => updateRange(index, 'endDate', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Sản phẩm có giá từ {formatCurrency(range.minPrice)} đến {formatCurrency(range.maxPrice)} sẽ được giảm {range.discountPercent}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">{isEdit ? 'Lưu thay đổi' : 'Tạo Voucher'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
