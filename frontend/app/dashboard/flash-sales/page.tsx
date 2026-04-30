'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { FlashSaleDialog } from '@/components/dashboard/flash-sale-dialog'
import { useFlashSales, useCreateFlashSale, useUpdateFlashSale, useDeleteFlashSale, useCategories } from '@/lib/api/hooks'
import { FlashSale, Category } from '@/types'
import { Search, Plus, Pencil, Trash2, Zap, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { mediaApi } from '@/lib/api/media'

export default function FlashSalesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const { user } = useAuth()

  const { data: flashSalesData, isLoading: flashSalesLoading } = useFlashSales()
  const { data: categoriesData } = useCategories()
  const createFlashSale = useCreateFlashSale()
  const updateFlashSale = useUpdateFlashSale()
  const deleteFlashSale = useDeleteFlashSale()

  const flashSales = Array.isArray(flashSalesData) ? flashSalesData : []
  const meta = Array.isArray(flashSalesData) ? { total: flashSalesData.length } : (flashSalesData as any)?.meta
  const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData as any)?.data || []

  const filteredFlashSales = flashSales.filter((fs: FlashSale) => {
    const matchesSearch =
      fs.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fs.categories.some((c: FlashSale["categories"][number]) => c.category?.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const now = new Date()
  const totalFlashSales = Number(meta?.total) || flashSales.length

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }
  const activeFlashSales = flashSales.filter((fs: FlashSale) => fs.isActive && new Date(fs.startAt) <= now && new Date(fs.endAt) >= now).length
  const upcomingFlashSales = flashSales.filter((fs: FlashSale) => new Date(fs.startAt) > now).length

  const handleAddFlashSale = (data: {
    name: string
    description?: string
    banner?: string
    startAt: string
    endAt: string
    isActive: boolean
    categoryIds: string[]
    ranges: { minPrice: number; maxPrice: number; discountPercent: number; endDate: string }[]
  }) => {
    createFlashSale.mutate(data)
  }

  const handleEditFlashSale = (data: {
    name: string
    description?: string
    banner?: string
    startAt: string
    endAt: string
    isActive: boolean
    categoryIds: string[]
    ranges: { minPrice: number; maxPrice: number; discountPercent: number; endDate: string }[]
  }) => {
    if (!selectedFlashSale) return
    updateFlashSale.mutate({
      id: selectedFlashSale.id,
      data,
    })
    setSelectedFlashSale(null)
  }

  const handleDeleteFlashSale = () => {
    if (!selectedFlashSale) return
    deleteFlashSale.mutate(selectedFlashSale.id)
    setSelectedFlashSale(null)
  }

  const openEditDialog = (fs: FlashSale) => {
    setSelectedFlashSale(fs)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (fs: FlashSale) => {
    setSelectedFlashSale(fs)
    setDeleteDialogOpen(true)
  }

  const getStatus = (fs: FlashSale) => {
    const now = new Date()
    if (new Date(fs.startAt) > now) return 'upcoming'
    if (new Date(fs.endAt) < now) return 'ended'
    if (fs.isActive) return 'active'
    return 'inactive'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Đang diễn ra</Badge>
      case 'upcoming':
        return <Badge variant="secondary">Sắp diễn ra</Badge>
      case 'ended':
        return <Badge variant="destructive">Đã kết thúc</Badge>
      default:
        return <Badge variant="outline">Không hoạt động</Badge>
    }
  }

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('vi-VN')
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Flash Sales</h1>
          <p className="text-muted-foreground">Quản lý các chương trình flash sale.</p>
        </div>
        <Button onClick={() => { setSelectedFlashSale(null); setEditDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo flash sale
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng flash sales</p>
            <p className="text-2xl font-bold">{totalFlashSales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang diễn ra</p>
            <p className="text-2xl font-bold text-green-600">{activeFlashSales}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sắp diễn ra</p>
            <p className="text-2xl font-bold text-blue-600">{upcomingFlashSales}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tất cả flash sales</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm flash sale..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flashSalesLoading ? (
            <div className="text-center py-4">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banner</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlashSales.map((fs) => {
                  const status = getStatus(fs)
                  return (
                    <TableRow key={fs.id}>
                      <TableCell>
                        {fs.banner ? (
                          <div className="w-20 h-12 rounded-md overflow-hidden bg-muted">
                            <img
                              src={mediaApi.getImageUrl(fs.banner)}
                              alt={fs.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            Không có
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{fs.name}</p>
                        {fs.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {fs.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {fs.categories.map((c) => (
                            <Badge key={c.id} variant="outline" className="text-xs">
                              {c.category?.name || '—'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Bắt đầu: {formatDateTime(fs.startAt)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Kết thúc: {formatDateTime(fs.endAt)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(fs)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(fs)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <Pagination
            page={page}
            limit={limit}
            total={Number(meta?.total) || 0}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </CardContent>
      </Card>

      <FlashSaleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        flashSale={selectedFlashSale}
        categories={categories}
        userId={user?.id || ''}
        isSaving={createFlashSale.isPending || updateFlashSale.isPending}
        onSave={selectedFlashSale ? handleEditFlashSale : handleAddFlashSale}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xóa flash sale</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Bạn có chắc chắn muốn xóa flash sale{' '}
            <span className="font-semibold">{selectedFlashSale?.name || ''}</span>? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                handleDeleteFlashSale()
                setDeleteDialogOpen(false)
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
