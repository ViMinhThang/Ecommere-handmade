'use client'

import { useState, useEffect } from 'react'
import { User, UserRole, UserStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { ImageSelector } from './image-selector'

interface SelectedImage {
  id: string
  path: string
  displayName: string
  url: string
}

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  onSave: (user: Partial<User> & { password?: string }) => void
}

interface UserFormData {
  name: string
  email: string
  password: string
  roles: UserRole[]
  status: UserStatus
  avatar: string
  phone?: string
  shopName?: string
}

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
  const { user: currentUser } = useAuth()
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    roles: ['ROLE_USER'],
    status: 'ACTIVE',
    avatar: '',
    phone: '',
    shopName: '',
  })

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)

  const isEdit = !!user

  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          password: '',
          roles: user.roles || ['ROLE_USER'],
          status: user.status || 'ACTIVE',
          avatar: user.avatar || '',
          phone: user.phone || '',
          shopName: user.shopName || '',
        })
        if (user.avatar) {
          setSelectedImage({
            id: '',
            path: user.avatar,
            displayName: 'Ảnh đại diện',
            url: user.avatar,
          })
        } else {
          setSelectedImage(null)
        }
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          roles: ['ROLE_USER'],
          status: 'ACTIVE',
          avatar: '',
          phone: '',
          shopName: '',
        })
        setSelectedImage(null)
      }
    }
  }, [open, user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      avatar: selectedImage?.url || '',
    })
    onOpenChange(false)
  }

  const handleSelectionChange = (images: SelectedImage[]) => {
    setSelectedImage(images[0] || null)
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ROLE_ADMIN': return 'Quản trị viên'
      case 'ROLE_SELLER': return 'Người bán'
      case 'ROLE_USER': return 'Khách hàng'
      default: return role
    }
  }

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động'
      case 'INACTIVE': return 'Không hoạt động'
      case 'PENDING': return 'Chờ duyệt'
      case 'SUSPENDED': return 'Bị khóa'
      default: return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 mb-4">
              <Label>Ảnh đại diện</Label>
              <ImageSelector
                userId={currentUser?.id || ''}
                selectedImages={selectedImage ? [selectedImage] : []}
                onSelectionChange={handleSelectionChange}
                mode="single"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name">Tên</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu {isEdit && '(để trống để giữ nguyên)'}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isEdit ? '••••••••' : 'Mặc định: Handmade@123'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Vai trò</Label>
                <Select
                  value={formData.roles?.[0] || 'ROLE_USER'}
                  onValueChange={(value) => setFormData({ ...formData, roles: [value as UserRole] })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {getRoleLabel(formData.roles?.[0] || 'ROLE_USER')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROLE_USER">Khách hàng</SelectItem>
                    <SelectItem value="ROLE_SELLER">Người bán</SelectItem>
                    <SelectItem value="ROLE_ADMIN">Quản trị viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as UserStatus })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {getStatusLabel(formData.status)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                    <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
                    <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                    <SelectItem value="SUSPENDED">Bị khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.roles?.includes('ROLE_SELLER') && (
              <div className="grid gap-2">
                <Label htmlFor="shopName">Tên cửa hàng</Label>
                <Input
                  id="shopName"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">{isEdit ? 'Lưu thay đổi' : 'Thêm người dùng'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onConfirm: () => void
}

export function DeleteDialog({ open, onOpenChange, userName, onConfirm }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Xóa người dùng</DialogTitle>
        </DialogHeader>
        <p className="py-4">
          Bạn có chắc chắn muốn xóa người dùng <span className="font-semibold">{userName}</span>? Hành động này không thể hoàn tác.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" variant="destructive" onClick={() => { onConfirm(); onOpenChange(false) }}>
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
