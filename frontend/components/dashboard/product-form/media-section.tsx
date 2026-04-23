"use client"

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Image as ImageIcon, Check, Trash2, Loader2 } from 'lucide-react'
import { mediaApi } from '@/lib/api/media'

interface MediaSectionProps {
  images: { url: string; isMain: boolean }[]
  descriptionImages: string[]
  isUploading: boolean
  onAddImage: (file: File) => void
  onAddDescriptionImage: (file: File) => void
  onRemoveImage: (index: number) => void
  onRemoveDescriptionImage: (index: number) => void
  onSetMainImage: (index: number) => void
}

export const MediaSection = memo(function MediaSection({
  images,
  descriptionImages,
  isUploading,
  onAddImage,
  onAddDescriptionImage,
  onRemoveImage,
  onRemoveDescriptionImage,
  onSetMainImage,
}: MediaSectionProps) {
  return (
    <Card id="media" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Hình ảnh sản phẩm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Gallery (Ít nhất 1 ảnh) *</Label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 bg-muted group">
                <img src={mediaApi.getImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                {img.isMain && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm">
                    Ảnh chính
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.isMain && (
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={() => onSetMainImage(idx)}
                      title="Đặt làm ảnh chính"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => onRemoveImage(idx)}
                    title="Xóa ảnh"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-3 uppercase tracking-tighter">Thêm ảnh mới</span>
              <Input 
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onAddImage(file)
                }}
              />
            </label>
          </div>
        </div>

        <div className="pt-6 border-t border-border/40">
          <Label>Hình ảnh Mô tả Tác phẩm (Tùy chọn)</Label>
          <p className="text-sm text-muted-foreground mb-4">Những hình ảnh này sẽ được hiển thị ngang hàng với phần Miêu tả trên trang xem tác phẩm.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {descriptionImages.map((imgUrl, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 bg-muted group">
                <img src={mediaApi.getImageUrl(imgUrl)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => onRemoveDescriptionImage(idx)}
                    title="Xóa ảnh"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-input flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group">
              <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground mt-3 uppercase tracking-tighter">Thêm ảnh mô tả</span>
              <Input 
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onAddDescriptionImage(file)
                }}
              />
            </label>
          </div>
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 text-primary font-medium p-4 bg-primary/5 rounded-lg border border-primary/10 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tải ảnh lên máy chủ...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
