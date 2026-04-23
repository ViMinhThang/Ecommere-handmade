'use client'

import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { useFolders, useMe } from '@/lib/api/hooks'
import { mediaApi } from '@/lib/api/media'
import { toast } from 'sonner'

interface SketchUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function SketchUpload({ value, onChange, label = "Tải bản phác thảo" }: SketchUploadProps) {
  const { data: user } = useMe()
  const { data: folders, isLoading: isLoadingFolders } = useFolders(user?.id || '')
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    try {
      // Find or create a 'Phác thảo' folder or just use the first one
      let folderId = folders?.find(f => f.name === 'Phác thảo')?.id
      
      if (!folderId) {
        if (folders && folders.length > 0) {
          folderId = folders[0].id
        } else {
          const newFolder = await mediaApi.createFolder(user.id, { name: 'Phác thảo' })
          folderId = newFolder.id
        }
      }

      const result = await mediaApi.uploadImage(folderId, file, file.name)
      const imageUrl = mediaApi.getImageUrl(result.path)
      onChange(imageUrl)
      toast.success('Đã tải bản phác thảo lên thành công')
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tải bản phác thảo')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative aspect-[4/5] w-full max-w-[200px] border rounded-lg overflow-hidden group shadow-sm">
          <img src={value} alt="Xem trước bản phác thảo" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-[#A35C3D] animate-spin" />
            ) : (
              <Upload className="h-10 w-10 text-slate-400 mb-2" />
            )}
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
              {isUploading ? 'Đang thực hiện tải lên...' : label}
            </p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleUpload} 
            disabled={isUploading || isLoadingFolders} 
          />
        </label>
      )}
    </div>
  )
}
