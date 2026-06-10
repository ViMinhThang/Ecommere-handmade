'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useLowStockProducts,
  useUpdateStock,
  useInventoryLog,
  useProducts,
} from '@/lib/api/hooks'
import { useAuth } from '@/contexts/auth-context'
import { Product, InventoryLog } from '@/types'
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  History,
  AlertTriangle,
  RefreshCcw,
  Boxes,
  ShoppingCart,
  LayoutList,
  Layers,
} from 'lucide-react'


type Reason = 'MANUAL' | 'RESTOCK' | 'RETURN'
type StockFilter = 'all' | 'out' | 'low' | 'ok'
type InventoryProduct = Product & { categoryName?: string }

const QUICK_RESTOCK = [10, 50, 100]

const getStockStatus = (product: Product) => {
  const stock = Number(product.stock) || 0
  const threshold = Number(product.lowStockThreshold) || 0
  if (stock === 0)
    return {
      label: 'Hết hàng',
      filter: 'out' as StockFilter,
      className:
        'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    }
  if (stock <= threshold)
    return {
      label: 'Sắp hết',
      filter: 'low' as StockFilter,
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
    }
  return {
    label: 'Còn hàng',
    filter: 'ok' as StockFilter,
    className:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  }
}

const getReasonLabel = (reason: string) => {
  switch (reason) {
    case 'MANUAL':
      return 'Điều chỉnh thủ công'
    case 'RESTOCK':
      return 'Nhập kho'
    case 'RETURN':
      return 'Hàng trả lại'
    case 'ORDER':
      return 'Đơn hàng'
    default:
      return reason
  }
}

function InventoryTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

export default function InventoryPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockChange, setStockChange] = useState(0)
  const [stockReason, setStockReason] = useState<Reason>('RESTOCK')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Low-stock endpoint (for low stock view)
  const {
    data: lowStockData,
    isLoading: lowStockLoading,
    isError: lowStockError,
    refetch: refetchLowStock,
  } = useLowStockProducts(user?.id, page, limit)

  // All products for seller (for full inventory view)
  const {
    data: allProductsData,
    isLoading: allLoading,
    isError: allError,
    refetch: refetchAll,
  } = useProducts(
    { sellerId: user?.id, page, limit },
    !showLowOnly && !!user?.id,
  )

  const updateStock = useUpdateStock()
  const { data: inventoryLogData, isLoading: logLoading } = useInventoryLog(
    selectedProduct?.id || '',
  )

  const isLoading = showLowOnly ? lowStockLoading : allLoading
  const isError = showLowOnly ? lowStockError : allError
  const refetch = showLowOnly ? refetchLowStock : refetchAll

  const rawProducts: InventoryProduct[] = showLowOnly
    ? (lowStockData?.data as InventoryProduct[]) || []
    : (allProductsData?.data as InventoryProduct[]) || []

  const meta = showLowOnly ? lowStockData?.meta : allProductsData?.meta

  // Client-side filter on top of server data
  const filteredProducts = rawProducts.filter((product) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query)

    if (!matchesSearch) return false

    if (stockFilter === 'all') return true
    const status = getStockStatus(product)
    return status.filter === stockFilter
  })

  // Summary stats (from raw full list)
  const totalStock = rawProducts.reduce(
    (sum, p) => sum + (Number(p.stock) || 0),
    0,
  )
  const lowCount = rawProducts.filter(
    (p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.lowStockThreshold),
  ).length
  const outCount = rawProducts.filter((p) => Number(p.stock) === 0).length
  const totalProducts = Number(meta?.total) || 0

  const openStockDialog = (product: Product) => {
    setSelectedProduct(product)
    setStockChange(0)
    setStockReason('RESTOCK')
    setStockDialogOpen(true)
  }

  const openHistoryDialog = (product: Product) => {
    setSelectedProduct(product)
    setHistoryDialogOpen(true)
  }

  const handleStockUpdate = () => {
    if (!selectedProduct || stockChange === 0) return
    updateStock.mutate(
      {
        productId: selectedProduct.id,
        data: { quantity: stockChange, reason: stockReason },
      },
      {
        onSuccess: () => {
          setStockDialogOpen(false)
          toast.success(
            `Cập nhật tồn kho "${selectedProduct.name}" thành công!`,
          )
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : 'Không thể cập nhật tồn kho.'
          toast.error(msg)
        },
      },
    )
  }

  const newStock = (selectedProduct?.stock || 0) + stockChange
  const isNegativeStock = newStock < 0

  const filterButtons: { key: StockFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'out', label: 'Hết hàng', count: outCount },
    { key: 'low', label: 'Sắp hết', count: lowCount },
    { key: 'ok', label: 'Còn hàng' },
  ]

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="artisan-title text-4xl flex items-center gap-2">
            <Boxes className="h-8 w-8" />
            Kho hàng
          </h1>
          <p className="artisan-subtitle mt-1">
            Quản lý tồn kho, theo dõi hàng sắp hết và nhập kho nhanh.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showLowOnly ? 'default' : 'outline'}
            onClick={() => {
              setShowLowOnly(!showLowOnly)
              setPage(1)
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {showLowOnly ? 'Xem tất cả' : 'Chỉ sắp hết'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Làm mới">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <LayoutList className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng sản phẩm</p>
              <p className="text-2xl font-bold">{totalProducts.toLocaleString('vi-VN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng tồn kho</p>
              <p className="text-2xl font-bold">{totalStock.toLocaleString('vi-VN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 dark:bg-yellow-500/15 p-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sắp hết</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">
                {lowCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 dark:bg-red-500/15 p-2">
              <ShoppingCart className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hết hàng</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-300">
                {outCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách sản phẩm</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Filter Chips */}
              <div className="flex gap-1">
                {filterButtons.map((btn) => (
                  <button
                    key={btn.key}
                    type="button"
                    onClick={() => setStockFilter(btn.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      stockFilter === btn.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {btn.label}
                    {btn.count !== undefined && (
                      <span className="ml-1 opacity-70">({btn.count})</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tên hoặc SKU..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <InventoryTableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Không thể tải dữ liệu kho hàng.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">
                Không tìm thấy sản phẩm nào
              </p>
              {searchQuery && (
                <button
                  type="button"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  onClick={() => setSearchQuery('')}
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead className="text-right">Ngưỡng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product)
                  const mainImage = product.images?.find((img) => img.isMain) ?? product.images?.[0]

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {mainImage ? (
                            <img
                              src={mainImage.url}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover border bg-muted flex-shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium line-clamp-1 max-w-[180px]">
                            {product.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {product.sku || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.categoryName || product.category?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold tabular-nums ${
                            Number(product.stock) === 0
                              ? 'text-destructive'
                              : Number(product.stock) <= Number(product.lowStockThreshold)
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : ''
                          }`}
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {product.lowStockThreshold}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStockDialog(product)}
                            className="text-primary hover:text-primary hover:bg-primary/10 text-xs"
                          >
                            Cập nhật
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openHistoryDialog(product)}
                            title="Lịch sử kho"
                          >
                            <History className="h-4 w-4" />
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
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      {/* ── Stock Update Dialog ── */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cập nhật tồn kho</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Product info */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
              {(() => {
                const mainImg =
                  selectedProduct?.images?.find((i) => i.isMain) ??
                  selectedProduct?.images?.[0]
                return mainImg ? (
                  <img
                    src={mainImg.url}
                    alt={selectedProduct?.name}
                    className="h-12 w-12 rounded-md object-cover border"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )
              })()}
              <div>
                <p className="font-medium text-sm">{selectedProduct?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Tồn kho hiện tại:{' '}
                  <span className="font-semibold text-foreground">
                    {selectedProduct?.stock}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick restock */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Nhập kho nhanh
              </Label>
              <div className="flex gap-2">
                {QUICK_RESTOCK.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-sm"
                    onClick={() => {
                      setStockChange(amount)
                      setStockReason('RESTOCK')
                    }}
                  >
                    +{amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Manual change */}
            <div className="grid gap-2">
              <Label htmlFor="change">Thay đổi tùy chỉnh (+/-)</Label>
              <Input
                id="change"
                type="number"
                value={stockChange}
                onChange={(e) =>
                  setStockChange(parseInt(e.target.value) || 0)
                }
                placeholder="VD: +20 để thêm, -5 để giảm"
              />
            </div>

            {/* Preview */}
            <div className="flex items-center justify-between rounded-md border px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Tồn kho sau cập nhật:</span>
              <span
                className={`font-bold tabular-nums text-base ${
                  isNegativeStock
                    ? 'text-destructive'
                    : stockChange > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stockChange < 0
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : ''
                }`}
              >
                {newStock}
                {isNegativeStock && (
                  <span className="ml-2 text-xs font-normal text-destructive">
                    (không hợp lệ)
                  </span>
                )}
              </span>
            </div>

            {/* Reason */}
            <div className="grid gap-2">
              <Label htmlFor="reason">Lý do</Label>
              <Select
                value={stockReason}
                onValueChange={(v) => setStockReason(v as Reason)}
              >
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTOCK">Nhập kho</SelectItem>
                  <SelectItem value="RETURN">Hàng trả lại</SelectItem>
                  <SelectItem value="MANUAL">Điều chỉnh thủ công</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockDialogOpen(false)}
              disabled={updateStock.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleStockUpdate}
              disabled={
                stockChange === 0 || isNegativeStock || updateStock.isPending
              }
            >
              {updateStock.isPending ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Lịch sử kho — {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[360px] overflow-y-auto py-2">
            {logLoading ? (
              <div className="space-y-2 px-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : !inventoryLogData ||
              (inventoryLogData as InventoryLog[]).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <History className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Chưa có lịch sử thay đổi kho
                </p>
              </div>
            ) : (
              <div className="space-y-2 px-1">
                {(inventoryLogData as InventoryLog[]).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          log.change > 0
                            ? 'bg-emerald-100 dark:bg-emerald-500/20'
                            : 'bg-red-100 dark:bg-red-500/20'
                        }`}
                      >
                        {log.change > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">
                          {getReasonLabel(log.reason)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold tabular-nums text-base ${
                        log.change > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {log.change > 0 ? '+' : ''}
                      {log.change}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
