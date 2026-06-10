'use client'

/* eslint-disable react/no-unescaped-entities */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customOrdersApi, CustomOrder } from '@/lib/api/custom-orders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SketchUpload } from '@/components/dashboard/sketch-upload'
import {
  Search,
  Eye,
  Plus,
  PenTool,
  CheckCircle,
  Truck,
  RefreshCcw,
  Clock3,
  X,
  AlertTriangle,
  ChevronRight,
  Hammer,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'

type OrderStatus = CustomOrder['status']
type StatusFilter = 'ALL' | OrderStatus

const STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string; dot: string }
> = {
  DRAFT: {
    label: 'Bản thảo',
    badgeClass:
      'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  PENDING_REVIEW: {
    label: 'Chờ khách duyệt',
    badgeClass:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
    dot: 'bg-yellow-400',
  },
  REVISION_REQUESTED: {
    label: 'Yêu cầu sửa',
    badgeClass:
      'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300',
    dot: 'bg-orange-400',
  },
  AWAITING_PAYMENT: {
    label: 'Chờ thanh toán',
    badgeClass:
      'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
    dot: 'bg-blue-400',
  },
  CRAFTING: {
    label: 'Đang chế tác',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    dot: 'bg-emerald-400',
  },
  FINISHING: {
    label: 'Đang hoàn thiện',
    badgeClass:
      'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300',
    dot: 'bg-teal-400',
  },
  SHIPPED: {
    label: 'Đang giao',
    badgeClass:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
    dot: 'bg-indigo-400',
  },
  DELIVERED: {
    label: 'Đã giao',
    badgeClass:
      'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
    dot: 'bg-green-500',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass:
      'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
    dot: 'bg-slate-300',
  },
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Bản thảo' },
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'REVISION_REQUESTED', label: 'Yêu cầu sửa' },
  { key: 'AWAITING_PAYMENT', label: 'Chờ TT' },
  { key: 'CRAFTING', label: 'Chế tác' },
  { key: 'FINISHING', label: 'Hoàn thiện' },
  { key: 'SHIPPED', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã giao' },
]

function TableSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  )
}

export default function SellerCustomOrdersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null)
  const [isSketchOpen, setIsSketchOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  const [sketchUrl, setSketchUrl] = useState('')
  const [artisanNote, setArtisanNote] = useState('')
  const [progressTitle, setProgressTitle] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [progressImageUrl, setProgressImageUrl] = useState('')

  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customOrders', 'seller'],
    queryFn: () => customOrdersApi.getSellerOrders(),
  })

  // ─── Mutations ────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      customOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công')
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
    },
    onError: () => toast.error('Lỗi khi cập nhật trạng thái'),
  })

  const submitSketch = useMutation({
    mutationFn: (data: {
      id: string
      sketchImageUrl: string
      artisanNote: string
    }) =>
      customOrdersApi.updateSketch(data.id, {
        sketchImageUrl: data.sketchImageUrl,
        artisanNote: data.artisanNote,
      }),
    onSuccess: () => {
      toast.success('Đã gửi bản phác thảo')
      setIsSketchOpen(false)
      setSelectedOrder(null)
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
    },
    onError: () => toast.error('Không thể gửi bản phác thảo'),
  })

  const createProgressEvent = useMutation({
    mutationFn: (data: {
      id: string
      title: string
      note?: string
      imageUrl?: string
      status: OrderStatus
    }) =>
      customOrdersApi.createProgressEvent(data.id, {
        title: data.title,
        note: data.note,
        imageUrl: data.imageUrl,
        status: data.status,
      }),
    onSuccess: (_, vars) => {
      toast.success('Đã thêm cập nhật tiến độ')
      setIsProgressOpen(false)
      setSelectedOrder(null)
      setProgressTitle('')
      setProgressNote('')
      setProgressImageUrl('')
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
      void queryClient.invalidateQueries({
        queryKey: ['customOrder', vars.id, 'progress'],
      })
    },
    onError: () => toast.error('Không thể thêm tiến độ lúc này'),
  })

  const cancelOrder = useMutation({
    mutationFn: (id: string) => customOrdersApi.cancel(id),
    onSuccess: () => {
      toast.success('Đã hủy đơn thiết kế')
      setIsCancelOpen(false)
      setSelectedOrder(null)
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
    },
    onError: () => toast.error('Không thể hủy đơn lúc này'),
  })

  // ─── Derived data ─────────────────────────────────────────────
  const allOrders = orders || []

  const stats = useMemo(
    () => ({
      total: allOrders.length,
      crafting: allOrders.filter((o) => o.status === 'CRAFTING').length,
      awaitingPayment: allOrders.filter((o) => o.status === 'AWAITING_PAYMENT').length,
      delivered: allOrders.filter((o) => o.status === 'DELIVERED').length,
      revisionRequested: allOrders.filter((o) => o.status === 'REVISION_REQUESTED').length,
    }),
    [allOrders],
  )

  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        order.title.toLowerCase().includes(q) ||
        order.customer?.name?.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'ALL' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [allOrders, searchQuery, statusFilter])

  // ─── Action handlers ──────────────────────────────────────────
  const handleNextStatus = (order: CustomOrder) => {
    const map: Partial<Record<OrderStatus, OrderStatus>> = {
      CRAFTING: 'FINISHING',
      FINISHING: 'SHIPPED',
      SHIPPED: 'DELIVERED',
    }
    const next = map[order.status]
    if (next) updateStatus.mutate({ id: order.id, status: next })
  }

  const openSketchDialog = (order: CustomOrder) => {
    setSelectedOrder(order)
    setSketchUrl(order.sketchImageUrl || '')
    setArtisanNote(order.artisanNote || '')
    setIsSketchOpen(true)
  }

  const openProgressDialog = (order: CustomOrder) => {
    setSelectedOrder(order)
    setProgressTitle('')
    setProgressNote('')
    setProgressImageUrl('')
    setIsProgressOpen(true)
  }

  const openCancelDialog = (order: CustomOrder) => {
    setSelectedOrder(order)
    setIsCancelOpen(true)
  }

  const handleSubmitSketch = () => {
    if (!selectedOrder) return
    submitSketch.mutate({
      id: selectedOrder.id,
      sketchImageUrl: sketchUrl,
      artisanNote,
    })
  }

  const handleSubmitProgress = () => {
    if (!selectedOrder || !progressTitle.trim()) return
    createProgressEvent.mutate({
      id: selectedOrder.id,
      status: selectedOrder.status,
      title: progressTitle.trim(),
      note: progressNote.trim() || undefined,
      imageUrl: progressImageUrl.trim() || undefined,
    })
  }

  // ─── Can send/update sketch: DRAFT or REVISION_REQUESTED ─────
  const canUpdateSketch = (s: OrderStatus) =>
    s === 'DRAFT' || s === 'REVISION_REQUESTED'

  const canAddProgress = (s: OrderStatus) =>
    !['DELIVERED', 'CANCELLED'].includes(s)

  const canCancel = (s: OrderStatus) =>
    !['DELIVERED', 'CANCELLED', 'SHIPPED'].includes(s)

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="artisan-title text-4xl flex items-center gap-2">
            <PenTool className="h-7 w-7" />
            Thiết kế riêng
          </h1>
          <p className="artisan-subtitle mt-1">
            Quản lý đơn hàng thiết kế độc bản, phác thảo và tiến độ chế tác.
          </p>
        </div>
        <Link href="/seller/custom-orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo đơn mới
          </Button>
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Tổng đơn', value: stats.total, color: '' },
          {
            label: 'Yêu cầu sửa',
            value: stats.revisionRequested,
            color: 'text-orange-600 dark:text-orange-400',
          },
          {
            label: 'Chờ thanh toán',
            value: stats.awaitingPayment,
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Đang chế tác',
            value: stats.crafting,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Đã giao',
            value: stats.delivered,
            color: 'text-green-600 dark:text-green-400',
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${s.color}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Table card ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách thiết kế riêng</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, khách hàng..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.key === 'ALL'
                  ? allOrders.length
                  : allOrders.filter((o) => o.status === f.key).length
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span className="ml-1 opacity-60">({count})</span>
                  )}
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Không thể tải đơn thiết kế riêng.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <PenTool className="h-12 w-12 text-muted-foreground/25" />
              <p className="font-medium text-muted-foreground">
                Không tìm thấy đơn thiết kế nào
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Mã đơn</TableHead>
                    <TableHead>Tên thiết kế</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Giá trị</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const meta = STATUS_META[order.status]
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {order.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell>
                          <p className="font-medium line-clamp-1 max-w-[180px]">
                            {order.title}
                          </p>
                          {order.leadTime && (
                            <p className="text-xs text-muted-foreground">
                              Thời gian: {order.leadTime}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {order.customer?.name || '—'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {order.customer?.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(Number(order.price))}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${meta.badgeClass} border-0`}>
                            <span
                              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 flex-wrap">
                            {/* Gửi / cập nhật phác thảo */}
                            {canUpdateSketch(order.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-8 gap-1 text-xs ${
                                  order.status === 'REVISION_REQUESTED'
                                    ? 'border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-500/40 dark:text-orange-400'
                                    : 'border-primary/30 text-primary hover:bg-primary/5'
                                }`}
                                onClick={() => openSketchDialog(order)}
                              >
                                <RefreshCcw className="h-3 w-3" />
                                {order.status === 'REVISION_REQUESTED'
                                  ? 'Phản hồi sửa'
                                  : 'Gửi phác thảo'}
                              </Button>
                            )}

                            {/* Cập nhật tiến độ */}
                            {canAddProgress(order.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs"
                                onClick={() => openProgressDialog(order)}
                              >
                                <Clock3 className="h-3 w-3" />
                                Tiến độ
                              </Button>
                            )}

                            {/* Advance status buttons */}
                            {order.status === 'CRAFTING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-500/40 dark:text-teal-400"
                                onClick={() => handleNextStatus(order)}
                                disabled={updateStatus.isPending}
                              >
                                <Hammer className="h-3 w-3" />
                                Hoàn thiện
                              </Button>
                            )}
                            {order.status === 'FINISHING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-400"
                                onClick={() => handleNextStatus(order)}
                                disabled={updateStatus.isPending}
                              >
                                <Truck className="h-3 w-3" />
                                Giao hàng
                              </Button>
                            )}
                            {order.status === 'SHIPPED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/40 dark:text-green-400"
                                onClick={() => handleNextStatus(order)}
                                disabled={updateStatus.isPending}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Đã giao
                              </Button>
                            )}

                            {/* Xem chi tiết */}
                            <Link href={`/seller/custom-orders/${order.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Xem chi tiết"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </Link>

                            {/* Hủy đơn */}
                            {canCancel(order.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Hủy đơn"
                                onClick={() => openCancelDialog(order)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sketch Dialog (Gửi / Cập nhật phác thảo) ── */}
      <Dialog open={isSketchOpen} onOpenChange={setIsSketchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {selectedOrder?.status === 'REVISION_REQUESTED'
                ? 'Phản hồi yêu cầu chỉnh sửa'
                : 'Gửi bản phác thảo'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.status === 'REVISION_REQUESTED'
                ? 'Tải lên phác thảo mới đáp lại yêu cầu chỉnh sửa của khách.'
                : 'Chia sẻ bản phác thảo thiết kế với khách hàng để xem xét và phê duyệt.'}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder?.revisionNote && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-950/30">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                Yêu cầu từ khách hàng:
              </p>
              <p className="text-sm italic text-orange-900 dark:text-orange-200">
                "{selectedOrder.revisionNote}"
              </p>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ảnh phác thảo</Label>
              <SketchUpload
                value={sketchUrl}
                onChange={(url) => setSketchUrl(url)}
                label="Tải bản phác thảo lên"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artisanNote">Ghi chú từ người bán</Label>
              <Textarea
                id="artisanNote"
                placeholder="Mô tả thiết kế, chất liệu, các điểm đặc biệt cần lưu ý..."
                className="h-28"
                value={artisanNote}
                onChange={(e) => setArtisanNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSketchOpen(false)}
              disabled={submitSketch.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitSketch}
              disabled={submitSketch.isPending}
            >
              {submitSketch.isPending ? 'Đang gửi...' : 'Gửi phác thảo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Progress Dialog ── */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Thêm cập nhật tiến độ
            </DialogTitle>
            <DialogDescription>
              Ghi lại quá trình chế tác để khách hàng theo dõi sản phẩm
              handmade của mình.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="progress-title">
                Tiêu đề{' '}
                <span className="text-xs text-muted-foreground">
                  ({progressTitle.length}/120)
                </span>
              </Label>
              <Input
                id="progress-title"
                placeholder="Ví dụ: Đã hoàn thiện phần thêu tên"
                value={progressTitle}
                onChange={(e) => setProgressTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress-note">Ghi chú</Label>
              <Textarea
                id="progress-note"
                placeholder="Mô tả ngắn phần việc đã hoàn thành, chất liệu đang dùng hoặc bước tiếp theo..."
                className="h-28"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label>Ảnh minh họa (tùy chọn)</Label>
              <SketchUpload
                value={progressImageUrl}
                onChange={(url) => setProgressImageUrl(url)}
                label="Tải ảnh tiến độ"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProgressOpen(false)}
              disabled={createProgressEvent.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmitProgress}
              disabled={
                createProgressEvent.isPending || !progressTitle.trim()
              }
            >
              {createProgressEvent.isPending ? 'Đang lưu...' : 'Lưu tiến độ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hủy đơn thiết kế</DialogTitle>
          </DialogHeader>
          <p className="py-3 text-sm text-muted-foreground">
            Bạn có chắc muốn hủy đơn thiết kế{' '}
            <span className="font-semibold text-foreground">
              "{selectedOrder?.title}"
            </span>
            ? Hành động này không thể hoàn tác và khách hàng sẽ được thông
            báo.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelOpen(false)}
              disabled={cancelOrder.isPending}
            >
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              disabled={cancelOrder.isPending}
              onClick={() =>
                selectedOrder && cancelOrder.mutate(selectedOrder.id)
              }
            >
              {cancelOrder.isPending ? 'Đang hủy...' : 'Hủy đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
