'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { FlashSale } from '@/types'
import { CreateFlashSaleDto } from '@/lib/api/flash-sales'
import { mediaApi } from '@/lib/api/media'
import {
  useAdminFlashSales,
  useCategories,
  useCreateFlashSale,
  useDeleteFlashSale,
  useUpdateFlashSale,
} from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FlashSaleDialog } from '@/components/dashboard/flash-sale-dialog'

type FlashSaleDisplayStatus = 'active' | 'paused' | 'ended' | 'upcoming' | 'inactive'

const formatDateTime = (date: Date | string) => new Date(date).toLocaleString('vi-VN')

const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Không giới hạn' : value.toLocaleString('vi-VN')

const getStatus = (flashSale: FlashSale): FlashSaleDisplayStatus => {
  const now = new Date()
  const startAt = new Date(flashSale.startAt)
  const endAt = new Date(flashSale.endAt)

  if (flashSale.saleState === 'PAUSED') return 'paused'
  if (flashSale.saleState === 'ENDED' || endAt < now) return 'ended'
  if (!flashSale.isActive) return 'inactive'
  if (startAt > now) return 'upcoming'
  return 'active'
}

const getStatusBadge = (status: FlashSaleDisplayStatus) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-600 text-white">Đang chạy</Badge>
    case 'paused':
      return <Badge variant="secondary">Tạm dừng</Badge>
    case 'ended':
      return <Badge variant="destructive">Đã kết thúc</Badge>
    case 'upcoming':
      return <Badge variant="outline">Sắp diễn ra</Badge>
    default:
      return <Badge variant="outline">Không hoạt động</Badge>
  }
}

const getRemainingUnits = (flashSale: FlashSale) => {
  if (flashSale.maxUnits === null || flashSale.maxUnits === undefined) return null
  return flashSale.maxUnits - (flashSale.soldUnits ?? 0) - (flashSale.reservedUnits ?? 0)
}

export default function FlashSalesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFlashSale, setSelectedFlashSale] = useState<FlashSale | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const { user } = useAuth()

  const {
    data: flashSalesData,
    isError: flashSalesError,
    isLoading: flashSalesLoading,
    refetch: refetchFlashSales,
  } = useAdminFlashSales()
  const { data: categoriesData } = useCategories()
  const createFlashSale = useCreateFlashSale()
  const updateFlashSale = useUpdateFlashSale()
  const deleteFlashSale = useDeleteFlashSale()

  const flashSales = flashSalesData || []
  const categories = categoriesData?.data || []

  const filteredFlashSales = flashSales.filter((flashSale) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true

    return (
      flashSale.name.toLowerCase().includes(query) ||
      flashSale.categories.some((category) =>
        category.category?.name.toLowerCase().includes(query),
      )
    )
  })

  const activeFlashSales = flashSales.filter((flashSale) => getStatus(flashSale) === 'active').length
  const pausedFlashSales = flashSales.filter((flashSale) => getStatus(flashSale) === 'paused').length
  const totalSoldUnits = flashSales.reduce((sum, flashSale) => sum + (flashSale.soldUnits ?? 0), 0)

  const paginatedFlashSales = filteredFlashSales.slice(
    (page - 1) * limit,
    page * limit,
  )

  const handleAddFlashSale = (data: CreateFlashSaleDto) => {
    createFlashSale.mutate(data, {
      onSuccess: () => {
        setEditDialogOpen(false)
      },
    })
  }

  const handleEditFlashSale = (data: CreateFlashSaleDto) => {
    if (!selectedFlashSale) return
    updateFlashSale.mutate(
      {
        id: selectedFlashSale.id,
        data,
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false)
          setSelectedFlashSale(null)
        },
      },
    )
  }

  const handleDeleteFlashSale = () => {
    if (!selectedFlashSale) return
    deleteFlashSale.mutate(selectedFlashSale.id)
    setSelectedFlashSale(null)
  }

  const openEditDialog = (flashSale: FlashSale) => {
    setSelectedFlashSale(flashSale)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (flashSale: FlashSale) => {
    setSelectedFlashSale(flashSale)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="artisan-title text-4xl">Flash sale</h1>
          <p className="text-muted-foreground">
            Quản lý chiến dịch, hạn mức bán và trạng thái guardrail.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedFlashSale(null)
            setEditDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo flash sale
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng flash sale</p>
            <p className="text-2xl font-bold">{flashSales.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang chạy</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
              {activeFlashSales}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tạm dừng</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">
              {pausedFlashSales}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đã bán qua flash sale</p>
            <p className="text-2xl font-bold">{totalSoldUnits.toLocaleString('vi-VN')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Tất cả flash sale</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Sold/reserved là readonly, được cập nhật bởi checkout guardrail.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Input
                placeholder="Tìm theo tên hoặc danh mục..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flashSalesLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Đang tải flash sale...
            </div>
          ) : flashSalesError ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/25 bg-destructive/10 p-6 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Không thể tải danh sách flash sale.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchFlashSales()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : filteredFlashSales.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-8 text-center">
              <p className="font-medium">Chưa có flash sale phù hợp</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo chiến dịch mới hoặc thay đổi từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banner</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn mức</TableHead>
                  <TableHead>Sold / Reserved / Còn</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFlashSales.map((flashSale) => {
                  const status = getStatus(flashSale)
                  const remainingUnits = getRemainingUnits(flashSale)

                  return (
                    <TableRow key={flashSale.id}>
                      <TableCell>
                        {flashSale.banner ? (
                          <div className="h-12 w-20 overflow-hidden rounded-md bg-muted">
                            <img
                              src={mediaApi.getImageUrl(flashSale.banner)}
                              alt={flashSale.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                            Không có
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{flashSale.name}</p>
                        {flashSale.description && (
                          <p className="max-w-xs truncate text-sm text-muted-foreground">
                            {flashSale.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {flashSale.categories.map((category) => (
                            <Badge key={category.id} variant="outline" className="text-xs">
                              {category.category?.name || 'Chưa rõ'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Bắt đầu: {formatDateTime(flashSale.startAt)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Kết thúc: {formatDateTime(flashSale.endAt)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(status)}
                          <p className="text-xs text-muted-foreground">
                            saleState: {flashSale.saleState || 'ACTIVE'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <p>Tổng: {formatNumber(flashSale.maxUnits)}</p>
                          <p>Mỗi khách: {formatNumber(flashSale.perUserLimit)}</p>
                          <p>Dự phòng: {flashSale.reserveStock ?? 0}</p>
                          <p>
                            Auto pause:{' '}
                            {flashSale.autoPauseThreshold ?? 'Chưa thiết lập'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <p>Sold: {(flashSale.soldUnits ?? 0).toLocaleString('vi-VN')}</p>
                          <p>
                            Reserved:{' '}
                            {(flashSale.reservedUnits ?? 0).toLocaleString('vi-VN')}
                          </p>
                          <p>
                            Còn:{' '}
                            {remainingUnits === null
                              ? 'Không giới hạn'
                              : remainingUnits.toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(flashSale)}
                            aria-label="Sửa flash sale"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(flashSale)}
                            aria-label="Xóa flash sale"
                          >
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
            total={filteredFlashSales.length}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit)
              setPage(1)
            }}
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
            <span className="font-semibold">{selectedFlashSale?.name || ''}</span>?
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteFlashSale.isPending}
              onClick={() => {
                handleDeleteFlashSale()
                setDeleteDialogOpen(false)
              }}
            >
              {deleteFlashSale.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
