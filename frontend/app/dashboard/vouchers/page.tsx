'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import {
  VoucherDialog,
  type VoucherDialogSavePayload,
} from '@/components/dashboard/voucher-dialog'
import {
  useAdminVouchers,
  useCreateVoucher,
  useUpdateVoucher,
  useDeleteVoucher,
  useCategories,
  useUsers,
} from '@/lib/api/hooks'
import { Voucher, Category } from '@/types'
import type { User } from '@/types'
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

type UsersResponse = {
  data?: User[]
}

type VoucherScopeFilter = 'all' | 'platform' | 'shop'

export default function VouchersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<VoucherScopeFilter>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const { data: vouchersData, isLoading: vouchersLoading } = useAdminVouchers({
    page,
    limit,
  })
  const { data: categoriesData } = useCategories()
  const { data: sellersData } = useUsers({
    role: 'ROLE_SELLER',
    status: 'ACTIVE',
    page: 1,
    limit: 50,
  })
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
  const sellers: User[] = Array.isArray(sellersData)
    ? sellersData
    : ((sellersData as UsersResponse | undefined)?.data ?? [])

  const filteredVouchers = vouchers.filter((voucher) => {
    const normalizedQuery = searchQuery.toLowerCase()
    const matchesScope =
      scopeFilter === 'all' ||
      (scopeFilter === 'platform' && !voucher.sellerId) ||
      (scopeFilter === 'shop' && Boolean(voucher.sellerId))
    return (
      matchesScope &&
      (voucher.name.toLowerCase().includes(normalizedQuery) ||
        voucher.code.toLowerCase().includes(normalizedQuery) ||
        voucher.seller?.shopName?.toLowerCase().includes(normalizedQuery) ||
        voucher.seller?.name?.toLowerCase().includes(normalizedQuery))
    )
  })

  const totalVouchers = Number(meta?.total) || vouchers.length
  const activeVouchers = vouchers.filter(
    (voucher) => voucher.isActive && new Date(voucher.endDate) > new Date(),
  ).length
  const expiredVouchers = vouchers.filter(
    (voucher) => new Date(voucher.endDate) <= new Date(),
  ).length
  const scopeOptions: Array<{ value: VoucherScopeFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'platform', label: 'Voucher sàn' },
    { value: 'shop', label: 'Voucher shop' },
  ]

  const handlePageChange = (newPage: number) => setPage(newPage)
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const handleAddVoucher = (voucherData: VoucherDialogSavePayload) => {
    createVoucher.mutate(voucherData)
  }

  const handleEditVoucher = (voucherData: VoucherDialogSavePayload) => {
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

  const isExpired = (voucher: Voucher) =>
    new Date(voucher.endDate) <= new Date()

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="artisan-title text-4xl">Mã giảm giá</h1>
          <p className="text-muted-foreground">
            Quản lý voucher sàn và voucher shop theo đúng phạm vi áp dụng.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedVoucher(null)
            setEditDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo voucher
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng voucher</p>
            <p className="text-2xl font-bold">{totalVouchers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-300">
              {activeVouchers}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Hết hạn</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-300">
              {expiredVouchers}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Tất cả voucher</CardTitle>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <div className="flex rounded-md border border-border/60 bg-muted/30 p-1">
                {scopeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setScopeFilter(option.value)}
                    className={`rounded-sm px-3 py-2 text-xs font-semibold transition ${
                      scopeFilter === option.value
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm voucher hoặc shop..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vouchersLoading ? (
            <div className="py-4 text-center">Đang tải...</div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Chưa có voucher phù hợp.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Phạm vi</TableHead>
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
                        <Tag className="mr-1 h-3 w-3" />
                        {voucher.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{voucher.name}</p>
                      {voucher.description ? (
                        <p className="max-w-xs truncate text-sm text-muted-foreground">
                          {voucher.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {voucher.sellerId ? (
                        <div className="space-y-1">
                          <Badge variant="secondary">Voucher shop</Badge>
                          <p className="text-xs text-muted-foreground">
                            {voucher.seller?.shopName ||
                              voucher.seller?.name ||
                              'Shop đã chọn'}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline">Voucher sàn</Badge>
                      )}
                    </TableCell>
                    <TableCell>{voucher.category?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {voucher.ranges.map((range, index) => (
                          <Badge
                            key={index}
                            variant={
                              new Date(range.endDate) > new Date()
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {formatCurrency(Number(range.minPrice))} -{' '}
                            {formatCurrency(Number(range.maxPrice))}:{' '}
                            {range.discountPercent}%
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
                      <span
                        className={
                          isExpired(voucher)
                            ? 'text-red-600 dark:text-red-300'
                            : ''
                        }
                      >
                        {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(voucher)}
                          aria-label="Sửa voucher"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(voucher)}
                          aria-label="Xóa voucher"
                        >
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
        sellers={sellers}
        onSave={selectedVoucher ? handleEditVoucher : handleAddVoucher}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xóa voucher</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Bạn có chắc chắn muốn xóa voucher{' '}
            <span className="font-semibold">{selectedVoucher?.name || ''}</span>
            ? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
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
