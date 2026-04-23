"use client"

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save } from 'lucide-react'
import { Category } from '@/types'

interface ProductFormHeaderProps {
  productId: string | null
  isSubmitting: boolean
  status: string
  categoryId: string
  categories: Category[]
  onSubmit: () => void
}

export const ProductFormHeader = memo(function ProductFormHeader({
  productId,
  isSubmitting,
  status,
  categoryId,
  categories,
  onSubmit,
}: ProductFormHeaderProps) {
  const router = useRouter()
  
  return (
    <header className="sticky top-[-1.75rem] -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 mb-8 z-30 border-b border-[#dac1b8]/20 bg-[#fdf9f3]/90 backdrop-blur-md">
      <div className="mx-auto max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard/products')}
            className="rounded-full h-9 w-9 hover:bg-[#dac1b8]/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-serif text-xl leading-tight">
              {productId ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
               <Badge variant="outline" className="text-[10px] py-0 h-4 uppercase tracking-tighter border-[#dac1b8]/40">
                {categoryId ? categories.find(c => c.id === categoryId)?.name : 'Bản nháp'}
               </Badge>
               {productId && (
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  status === 'APPROVED' ? 'text-green-600' :
                  status === 'REJECTED' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  • {status === 'APPROVED' ? 'Đã duyệt' :
                     status === 'REJECTED' ? 'Từ chối' : 'Đang chờ'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/products')}
            className="hidden sm:flex border-[#dac1b8]/40 hover:bg-[#dac1b8]/10"
          >
            Hủy bỏ
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={isSubmitting}
            className="bg-[#853724] hover:bg-[#6b2c1d] shadow-lg shadow-[#853724]/10 px-6 h-10"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {productId ? 'Lưu thay đổi' : 'Đăng sản phẩm'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
})
