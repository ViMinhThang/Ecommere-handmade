'use client'

import { useState, useEffect } from 'react'
import { ImageFolder, Image } from '@/types'
import { mediaApi } from '@/lib/api/media'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Folder as FolderIcon, Image as ImageIcon, Radio } from 'lucide-react'

interface SelectedImage {
  id: string
  path: string
  displayName: string
  url: string
  isMain?: boolean
}

interface ImageSelectorProps {
  userId: string
  selectedImages: SelectedImage[]
  onSelectionChange: (images: SelectedImage[]) => void
  mode: 'single' | 'multiple'
}

export function ImageSelector({ userId, selectedImages, onSelectionChange, mode }: ImageSelectorProps) {
  const [folders, setFolders] = useState<ImageFolder[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const fetchFolders = async () => {
    try {
      const data = await mediaApi.getFolders(userId)
      const folderList = data as ImageFolder[]
      setFolders(folderList)
      if (folderList.length > 0) {
        setSelectedFolderId(folderList[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error)
    }
  }

  const fetchImages = async () => {
    if (!selectedFolderId) return
    setLoading(true)
    try {
      const data = await mediaApi.getImages(selectedFolderId)
      setImages(data as Image[])
    } catch (error) {
      console.error('Failed to fetch images:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchFolders()
    }
  }, [userId])

  useEffect(() => {
    if (userId && selectedFolderId) {
      fetchImages()
    }
  }, [userId, selectedFolderId])

  const handleFolderChange = (value: string | null) => {
    if (value) setSelectedFolderId(value)
  }

  const handleImageSelect = (image: Image) => {
    const imageUrl = mediaApi.getImageUrl(image.path)
    const newImage: SelectedImage = {
      id: image.id,
      path: image.path,
      displayName: image.displayName,
      url: imageUrl,
    }

    if (mode === 'single') {
      onSelectionChange([newImage])
    } else {
      const isAlreadySelected = selectedImages.some(img => img.id === image.id)
      if (isAlreadySelected) {
        onSelectionChange(selectedImages.filter(img => img.id !== image.id))
      } else {
        const newSelection = [...selectedImages, newImage]
        if (newSelection.length === 1) {
          newSelection[0].isMain = true
        }
        onSelectionChange(newSelection)
      }
    }
  }

  const handleSetMain = (imageId: string) => {
    const newSelection = selectedImages.map(img => ({
      ...img,
      isMain: img.id === imageId,
    }))
    onSelectionChange(newSelection)
  }

  const handleRemoveImage = (imageId: string) => {
    const newSelection = selectedImages.filter(img => img.id !== imageId)
    if (mode === 'multiple' && newSelection.length > 0 && !newSelection.some(img => img.isMain)) {
      newSelection[0].isMain = true
    }
    onSelectionChange(newSelection)
  }

  const isSelected = (imageId: string) => {
    return selectedImages.some(img => img.id === imageId)
  }

  const isMain = (imageId: string) => {
    return selectedImages.find(img => img.id === imageId)?.isMain || false
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-8 p-4 border rounded-lg bg-muted/50">
        <FolderIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground mb-2">Không có thư mục</p>
        <p className="text-xs text-muted-foreground">
          Vui lòng tạo thư mục và tải ảnh lên trong trang Media trước.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Chọn thư mục</Label>
        <Select value={selectedFolderId} onValueChange={handleFolderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn thư mục">
              {folders.find(f => f.id === selectedFolderId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedFolderId && (
        <div className="space-y-2">
          <Label>Chọn hình ảnh</Label>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Đang tải...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 p-4 border rounded-lg bg-muted/50">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Không có hình ảnh trong thư mục này</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tải ảnh lên trong trang Media trước.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected(image.id) ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => handleImageSelect(image)}
                >
                  <div className="aspect-square">
                    <img
                      src={mediaApi.getImageUrl(image.path)}
                      alt={image.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {mode === 'multiple' && (
                    <div 
                      className="absolute top-1 left-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected(image.id)}
                        onCheckedChange={() => handleImageSelect(image)}
                      />
                    </div>
                  )}
                  {mode === 'multiple' && isSelected(image.id) && (
                    <div 
                      className="absolute top-1 right-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant={isMain(image.id) ? 'default' : 'outline'}
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSetMain(image.id)}
                      >
                        <Radio className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {mode === 'single' && isSelected(image.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <Label>Đã chọn</Label>
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border"
              >
                <div className="w-16 h-16">
                  <img
                    src={image.url}
                    alt={image.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {mode === 'multiple' && image.isMain && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-0.5">
                    Chính
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(image.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}