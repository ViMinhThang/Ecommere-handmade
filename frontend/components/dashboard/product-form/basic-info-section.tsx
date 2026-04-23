"use client"

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Category } from '@/types'

interface BasicInfoSectionProps {
  name: string
  description: string
  categoryId: string
  categories: Category[]
  onChange: (field: string, value: any) => void
}

export const BasicInfoSection = memo(function BasicInfoSection({
  name,
  description,
  categoryId,
  categories,
  onChange,
}: BasicInfoSectionProps) {
  return (
    <Card id="basic" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Thông tin cơ bản</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="name">Tên sản phẩm *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Nhập tên sản phẩm..."
            className="mt-2"
          />
        </div>
        <div className="pb-8">
          <Label htmlFor="description" className="mb-2 block">Mô tả (Rich Text)</Label>
          <RichTextEditor
            value={description} 
            onChange={(val) => onChange('description', val)} 
          />
        </div>
        <div>
          <Label>Danh mục *</Label>
          <Select 
            value={categoryId ?? ''}
            onValueChange={(v) => onChange('categoryId', v)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Chọn danh mục...">
                {categories.find(c => c.id === categoryId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
})
