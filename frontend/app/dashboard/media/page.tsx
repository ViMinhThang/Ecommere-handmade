'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  useFolders,
  useFolder,
  useImages,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useUploadImage,
  useDeleteImage,
} from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { mediaApi } from '@/lib/api/media'
import { ImageFolder, Image } from '@/types'
import { Search, Plus, Pencil, Trash2, Folder as FolderIcon, Image as ImageIcon, ArrowLeft, Upload, X } from 'lucide-react'

export default function MediaPage() {
  const { user } = useAuth()
  const [userId, setUserId] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<ImageFolder | null>(null)
  const [folderName, setFolderName] = useState('')
  const [imageDisplayName, setImageDisplayName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id)
    }
  }, [user])

  const { data: foldersData, isLoading: foldersLoading } = useFolders(userId)
  const { data: folderData, isLoading: folderLoading } = useFolder(selectedFolderId || '')
  const { data: imagesData, isLoading: imagesLoading } = useImages(selectedFolderId || '')

  const createFolder = useCreateFolder()
  const updateFolder = useUpdateFolder()
  const deleteFolder = useDeleteFolder()
  const uploadImage = useUploadImage()
  const deleteImage = useDeleteImage()

  const folders = (foldersData as ImageFolder[]) || []
  const images = (imagesData as Image[]) || []

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredImages = images.filter((image) =>
    image.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateFolder = () => {
    if (!folderName.trim()) return
    createFolder.mutate(
      { userId, data: { name: folderName } },
      {
        onSuccess: () => {
          setFolderDialogOpen(false)
          setFolderName('')
        },
      }
    )
  }

  const handleUpdateFolder = () => {
    if (!selectedFolder || !folderName.trim()) return
    updateFolder.mutate(
      { userId, folderId: selectedFolder.id, data: { name: folderName } },
      {
        onSuccess: () => {
          setFolderDialogOpen(false)
          setFolderName('')
          setSelectedFolder(null)
        },
      }
    )
  }

  const handleDeleteFolder = () => {
    if (!selectedFolder) return
    deleteFolder.mutate(
      { userId, folderId: selectedFolder.id },
      {
        onSuccess: () => {
          setDeleteFolderDialogOpen(false)
          setSelectedFolder(null)
          setSelectedFolderId(null)
        },
      }
    )
  }

  const handleUploadImage = () => {
    if (!selectedFolderId || !selectedFile || !imageDisplayName.trim()) return
    uploadImage.mutate(
      { folderId: selectedFolderId, file: selectedFile, displayName: imageDisplayName },
      {
        onSuccess: () => {
          setUploadDialogOpen(false)
          setSelectedFile(null)
          setImageDisplayName('')
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        },
      }
    )
  }

  const handleDeleteImage = (imageId: string) => {
    if (!selectedFolderId) return
    deleteImage.mutate({ imageId, folderId: selectedFolderId })
  }

  const openEditFolderDialog = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setFolderName(folder.name)
    setFolderDialogOpen(true)
  }

  const openDeleteFolderDialog = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setDeleteFolderDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      if (!imageDisplayName) {
        setImageDisplayName(e.target.files[0].name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedFolderId && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedFolderId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="artisan-title text-4xl">Thư viện ảnh</h1>
            <p className="text-muted-foreground">Quản lý thư mục và hình ảnh của bạn.</p>
          </div>
        </div>
        {!selectedFolderId && (
          <Button
            onClick={() => {
              setSelectedFolder(null)
              setFolderName('')
              setFolderDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thư mục mới
          </Button>
        )}
        {selectedFolderId && (
          <Button
            onClick={() => {
              setSelectedFile(null)
              setImageDisplayName('')
              setUploadDialogOpen(true)
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Tải ảnh lên
          </Button>
        )}
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={selectedFolderId ? 'Tìm ảnh...' : 'Tìm thư mục...'}
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {selectedFolderId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              {(folderData as ImageFolder)?.name || 'Thư mục'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagesLoading ? (
              <div className="text-center py-4">Đang tải...</div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không có ảnh trong thư mục này</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSelectedFile(null)
                    setImageDisplayName('')
                    setUploadDialogOpen(true)
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Tải ảnh đầu tiên
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredImages.map((image) => (
                  <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={mediaApi.getImageUrl(image.path)}
                      alt={image.displayName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-xs text-white truncate">{image.displayName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Thư mục</CardTitle>
          </CardHeader>
          <CardContent>
            {foldersLoading ? (
              <div className="text-center py-4">Đang tải...</div>
            ) : filteredFolders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có thư mục</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSelectedFolder(null)
                    setFolderName('')
                    setFolderDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo thư mục đầu tiên
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FolderIcon className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium text-center truncate w-full">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {folder._count?.images || 0} ảnh
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditFolderDialog(folder)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteFolderDialog(folder)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFolder ? 'Sửa thư mục' : 'Tạo thư mục'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên thư mục</label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Nhập tên thư mục"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={selectedFolder ? handleUpdateFolder : handleCreateFolder}>
              {selectedFolder ? 'Lưu' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thư mục</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Bạn có chắc chắn muốn xóa "{selectedFolder?.name}"? Tất cả ảnh trong thư mục này cũng sẽ bị xóa.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFolderDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tải ảnh lên</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File ảnh</label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            {selectedFile && (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên hiển thị</label>
              <Input
                value={imageDisplayName}
                onChange={(e) => setImageDisplayName(e.target.value)}
                placeholder="Nhập tên ảnh"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUploadImage} disabled={!selectedFile || !imageDisplayName.trim()}>
              Tải lên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

