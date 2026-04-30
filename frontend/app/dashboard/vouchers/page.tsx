'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { VoucherDialog } from '@/components/dashboard/voucher-dialog'
import { useVouchers, useCreateVoucher, useUpdateVoucher, useDeleteVoucher, useCategories } from '@/lib/api/hooks'
import { Voucher, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Search, Plus, Pencil, Trash2, Tag } from 'lucide-react'

type VouchersResponse = {
  data?: Voucher[]
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

type CategoriesResponse = {
  data?: Category[]
}

export default function VouchersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const { data: vouchersData, isLoading: vouchersLoading } = useVouchers({ page, limit })
  const { data: categoriesData } = useCategories()
  const createVoucher = useCreateVoucher()
  const updateVoucher = useUpdateVoucher()
  const deleteVoucher = useDeleteVoucher()

  const vouchers: Voucher[] = Array.isArray(vouchersData)
    ? vouchersData
    : ((vouchersData as VouchersResponse | undefined)?.data ?? [])
  const meta = Array.isArray(vouchersData)
    ? { total: vouchersData.length }
    : (vouchersData as VouchersResponse | undefined)?.meta
  const categories: Category[] = Array.isArray(categoriesData)
    ? categoriesData
    : ((categoriesData as CategoriesResponse | undefined)?.data ?? [])

  const filteredVouchers = vouchers.filter((voucher: Voucher) => {
    const matchesSearch =
      voucher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voucher.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const totalVouchers = Number(meta?.total) || vouchers.length

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }
  const activeVouchers = vouchers.filter((v) => v.isActive && new Date(v.endDate) > new Date()).length
  const expiredVouchers = vouchers.filter((v) => new Date(v.endDate) <= new Date()).length

  const handleAddVoucher = (voucherData: {
    name: string
    description?: string
    code: string
    categoryId: string
    isActive: boolean
    endDate: string
    ranges: { minPrice: number; maxPrice: number; discountPercent: number; endDate: string }[]
  }) => {
    createVoucher.mutate(voucherData)
  }

  const handleEditVoucher = (voucherData: {
    name: string
    description?: string
    code: string
    categoryId: string
    isActive: boolean
    endDate: string
    ranges: { minPrice: number; maxPrice: number; discountPercent: number; endDate: string }[]
  }) => {
    if (!selectedVoucher) return
    updateVoucher.mutate({
      id: selectedVoucher.id,
      data: voucherData,
    })
    setSelectedVoucher(null)
  }

  const handleDeleteVoucher = () => {
    if (!selectedVoucher) return
    deleteVoucher.mutate(selectedVoucher.id)
    setSelectedVoucher(null)
  }

  const openEditDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setDeleteDialogOpen(true)
  }

  const isExpired = (voucher: Voucher) => {
    return new Date(voucher.endDate) <= new Date()
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Vouchers</h1>
          <p className="text-muted-foreground">Quản lý mã giảm giá theo danh mục.</p>
        </div>
        <Button onClick={() => { setSelectedVoucher(null); setEditDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo voucher
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng vouchers</p>
            <p className="text-2xl font-bold">{totalVouchers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            <p className="text-2xl font-bold text-green-600">{activeVouchers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Hết hạn</p>
            <p className="text-2xl font-bold text-red-600">{expiredVouchers}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tất cả vouchers</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm voucher..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vouchersLoading ? (
            <div className="text-center py-4">Đang tải...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Số khoảng giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn sử dụng</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        <Tag className="h-3 w-3 mr-1" />
                        {voucher.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{voucher.name}</p>
                      {voucher.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {voucher.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{voucher.category?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {voucher.ranges.map((range, index) => (
                          <Badge
                            key={index}
                            variant={new Date(range.endDate) > new Date() ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {formatCurrency(Number(range.minPrice))} - {formatCurrency(Number(range.maxPrice))}: {range.discountPercent}%
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExpired(voucher) ? (
                        <Badge variant="destructive">Hết hạn</Badge>
                      ) : voucher.isActive ? (
                        <Badge variant="default">Hoạt động</Badge>
                      ) : (
                        <Badge variant="secondary">Không hoạt động</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={isExpired(voucher) ? 'text-red-600' : ''}>
                        {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(voucher)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(voucher)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      <VoucherDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        voucher={selectedVoucher}
        categories={categories}
        onSave={selectedVoucher ? handleEditVoucher : handleAddVoucher}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xóa voucher</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Bạn có chắc chắn muốn xóa voucher{' '}
            <span className="font-semibold">{selectedVoucher?.name || ''}</span>? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                handleDeleteVoucher()
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
