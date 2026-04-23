"use client"

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PricingSectionProps {
  price: number
  sku: string
  onChange: (field: string, value: any) => void
}

export const PricingSection = memo(function PricingSection({
  price,
  sku,
  onChange,
}: PricingSectionProps) {
  const estimatedEarnings = price * 0.85

  return (
    <Card id="pricing" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Giá & Khả dụng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="price">Giá bán (VNĐ) *</Label>
            <div className="mt-2 relative">
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
                className="pr-12 font-semibold text-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">VNĐ</span>
            </div>
          </div>
          <div>
            <Label htmlFor="sku">SKU (Mã lưu kho)</Label>
            <Input
              id="sku"
              value={sku ?? ''}
              onChange={(e) => onChange('sku', e.target.value)}
              placeholder="Ví dụ: ART-001"
              className="mt-2"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-green-600 dark:text-green-500 font-medium uppercase tracking-wider">Ước tính thu nhập của bạn</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatCurrency(estimatedEarnings)} <span className="text-xs font-normal opacity-70">(sau khi trừ 15% phí nền tảng)</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
