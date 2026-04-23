"use client"

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface InventorySectionProps {
  stock: number
  onChange: (field: string, value: any) => void
}

export const InventorySection = memo(function InventorySection({
  stock,
  onChange,
}: InventorySectionProps) {
  return (
    <Card id="inventory" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Tồn kho</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="stock">Số lượng tồn kho *</Label>
          <Input
            id="stock"
            type="number"
            value={stock}
            onChange={(e) => onChange('stock', parseInt(e.target.value) || 0)}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  )
})
