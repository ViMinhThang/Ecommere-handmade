'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customOrdersApi } from '@/lib/api/custom-orders'
import { useMe } from '@/lib/api/hooks'
import { toast } from 'sonner'
import { mediaApi } from '@/lib/api/media'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SketchUpload } from '@/components/dashboard/sketch-upload'
import { CustomOrderTimeline } from '@/components/custom-orders/custom-order-timeline'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  Hammer,
  Package,
  PenTool,
  RefreshCcw,
  Truck,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: { label: 'Bản thảo', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300' },
  PENDING_REVIEW: { label: 'Chờ khách duyệt', badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300' },
  REVISION_REQUESTED: { label: 'Yêu cầu sửa', badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' },
  CRAFTING: { label: 'Đang chế tác', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' },
  FINISHING: { label: 'Đang hoàn thiện', badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300' },
  SHIPPED: { label: 'Đang giao', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300' },
  DELIVERED: { label: 'Đã giao', badgeClass: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' },
  CANCELLED: { label: 'Đã hủy', badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400' },
}

export default function SellerCustomOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const queryClient = useQueryClient()

  const [isSketchOpen, setIsSketchOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  const [sketchUrl, setSketchUrl] = useState('')
  const [artisanNote, setArtisanNote] = useState('')
  const [progressTitle, setProgressTitle] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [progressImageUrl, setProgressImageUrl] = useState('')

  const { data: user } = useMe()
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['customOrder', id],
    queryFn: () => customOrdersApi.getById(id),
    enabled: !!id,
  })

  // ─── Mutations ─────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      customOrdersApi.updateStatus(id, status as Parameters<typeof customOrdersApi.updateStatus>[1]),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công')
      void queryClient.invalidateQueries({ queryKey: ['customOrder', id] })
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
    },
    onError: () => toast.error('Lỗi khi cập nhật trạng thái'),
  })

  const submitSketch = useMutation({
    mutationFn: () =>
      customOrdersApi.updateSketch(id, { sketchImageUrl: sketchUrl, artisanNote }),
    onSuccess: () => {
      toast.success('Đã gửi bản phác thảo đến khách hàng')
      setIsSketchOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['customOrder', id] })
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
    },
    onError: () => toast.error('Không thể gửi bản phác thảo'),
  })

  const createProgress = useMutation({
    mutationFn: () =>
      customOrdersApi.createProgressEvent(id, {
        title: progressTitle.trim(),
        note: progressNote.trim() || undefined,
        imageUrl: progressImageUrl.trim() || undefined,
        status: order?.status,
      }),
    onSuccess: () => {
      toast.success('Đã thêm cập nhật tiến độ')
      setIsProgressOpen(false)
      setProgressTitle('')
      setProgressNote('')
      setProgressImageUrl('')
      void queryClient.invalidateQueries({ queryKey: ['customOrder', id] })
      void queryClient.invalidateQueries({ queryKey: ['customOrder', id, 'progress'] })
    },
    onError: () => toast.error('Không thể thêm tiến độ'),
  })

  const cancelOrder = useMutation({
    mutationFn: () => customOrdersApi.cancel(id),
    onSuccess: () => {
      toast.success('Đã hủy đơn thiết kế')
      setIsCancelOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['customOrder', id] })
      void queryClient.invalidateQueries({ queryKey: ['customOrders', 'seller'] })
      router.push('/seller/custom-orders')
    },
    onError: () => toast.error('Không thể hủy đơn lúc này'),
  })

  const openSketchDialog = () => {
    setSketchUrl(order?.sketchImageUrl || '')
    setArtisanNote(order?.artisanNote || '')
    setIsSketchOpen(true)
  }

  const handleNextStatus = () => {
    const map: Record<string, string> = {
      CRAFTING: 'FINISHING',
      FINISHING: 'SHIPPED',
      SHIPPED: 'DELIVERED',
    }
    const next = order?.status ? map[order.status] : null
    if (next) updateStatus.mutate(next)
  }

  const canUpdateSketch =
    order?.status === 'DRAFT' || order?.status === 'REVISION_REQUESTED'
  const canAddProgress = order?.status
    ? !['DELIVERED', 'CANCELLED'].includes(order.status)
    : false
  const canCancel = order?.status
    ? !['DELIVERED', 'CANCELLED', 'SHIPPED'].includes(order.status)
    : false
  const nextStatusLabel: Record<string, string> = {
    CRAFTING: 'Hoàn thiện',
    FINISHING: 'Giao hàng',
    SHIPPED: 'Xác nhận đã giao',
  }

  // ─── Loading / error ───────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Không tìm thấy đơn thiết kế này.</p>
        <Link href="/seller/custom-orders">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    )
  }

  const meta = STATUS_META[order.status] ?? { label: order.status, badgeClass: '' }
  const isSeller = user?.id === order.sellerId

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + Actions ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/seller/custom-orders">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="artisan-title text-2xl leading-tight">{order.title}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              #{order.id.slice(0, 12)}…
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdateSketch && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openSketchDialog}>
              <RefreshCcw className="h-3.5 w-3.5" />
              {order.status === 'REVISION_REQUESTED' ? 'Phản hồi sửa' : 'Gửi phác thảo'}
            </Button>
          )}
          {canAddProgress && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsProgressOpen(true)}>
              <Clock className="h-3.5 w-3.5" />
              Cập nhật tiến độ
            </Button>
          )}
          {order.status && nextStatusLabel[order.status] && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleNextStatus}
              disabled={updateStatus.isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {updateStatus.isPending ? 'Đang cập nhật...' : nextStatusLabel[order.status]}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => setIsCancelOpen(true)}
            >
              <X className="h-3.5 w-3.5" />
              Hủy đơn
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Main content ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status + Info card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <Badge className={`${meta.badgeClass} border-0 text-sm px-3 py-1`}>
                    {meta.label}
                  </Badge>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Tạo lúc {new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    {order.leadTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Thời gian: {order.leadTime}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Giá trị đơn</p>
                  <p className="text-3xl font-bold font-serif text-primary">
                    {formatCurrency(Number(order.price))}
                  </p>
                </div>
              </div>

              {/* Specifications */}
              {order.specifications && order.specifications.length > 0 && (
                <div className="mt-5 pt-5 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Thông số tùy chỉnh
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {order.specifications.map((spec, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {typeof spec === 'string' ? spec : `${spec.label}: ${spec.value}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision note from customer */}
              {order.status === 'REVISION_REQUESTED' && order.revisionNote && (
                <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-950/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-2">
                    Yêu cầu chỉnh sửa từ khách hàng:
                  </p>
                  <p className="text-sm italic text-orange-900 dark:text-orange-200">
                    "{order.revisionNote}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sketch preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PenTool className="h-4 w-4 text-primary" />
                Bản phác thảo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.sketchImageUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] max-h-[400px] overflow-hidden rounded-xl border bg-muted">
                    <img
                      src={mediaApi.getImageUrl(order.sketchImageUrl)}
                      alt="Phác thảo thiết kế"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {order.artisanNote && (
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Ghi chú từ bạn
                      </p>
                      <p className="text-sm leading-relaxed italic text-foreground/80">
                        "{order.artisanNote}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-12 text-center">
                  <PenTool className="h-10 w-10 text-muted-foreground/25" />
                  <p className="font-medium text-muted-foreground">Chưa có bản phác thảo</p>
                  <p className="text-sm text-muted-foreground/70">
                    Gửi bản phác thảo để khách hàng xem xét và phê duyệt.
                  </p>
                  <Button variant="outline" size="sm" onClick={openSketchDialog} className="mt-2">
                    <PenTool className="mr-2 h-3.5 w-3.5" />
                    Gửi phác thảo đầu tiên
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <CustomOrderTimeline customOrderId={id} className="dark:border-border dark:bg-card dark:text-foreground" />
        </div>

        {/* ── Right: Sidebar info ── */}
        <div className="space-y-5">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{order.customer?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{order.customer?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className="font-medium">
                    {order.paymentStatus === 'PAID'
                      ? '✅ Đã thanh toán'
                      : order.paymentStatus === 'UNPAID'
                      ? '⏳ Chưa thanh toán'
                      : order.paymentStatus === 'PARTIALLY_REFUNDED'
                      ? '↩️ Hoàn tiền một phần'
                      : order.paymentStatus === 'REFUNDED'
                      ? '↩️ Đã hoàn tiền'
                      : order.paymentStatus || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Giá trị</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(Number(order.price))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Luồng xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {[
                  { status: 'DRAFT', label: 'Gửi phác thảo', icon: PenTool },
                  { status: 'PENDING_REVIEW', label: 'Chờ khách duyệt', icon: Clock },
                  { status: 'AWAITING_PAYMENT', label: 'Khách thanh toán', icon: CheckCircle },
                  { status: 'CRAFTING', label: 'Bắt đầu chế tác', icon: Hammer },
                  { status: 'FINISHING', label: 'Hoàn thiện sản phẩm', icon: CheckCircle },
                  { status: 'SHIPPED', label: 'Giao hàng', icon: Truck },
                  { status: 'DELIVERED', label: 'Hoàn tất', icon: CheckCircle },
                ].map(({ status, label, icon: Icon }) => {
                  const isActive = order.status === status
                  const statuses = Object.keys(STATUS_META)
                  const currentIdx = statuses.indexOf(order.status)
                  const thisIdx = statuses.indexOf(status)
                  const isDone = thisIdx < currentIdx
                  return (
                    <li
                      key={status}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : isDone
                          ? 'text-muted-foreground/50 line-through'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          {/* Quick view link for customer */}
          <div className="text-center">
            <Link
              href={`/custom-orders/${order.id}/review`}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
              target="_blank"
            >
              Xem trang khách hàng →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {/* Sketch dialog */}
      <Dialog open={isSketchOpen} onOpenChange={setIsSketchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {order.status === 'REVISION_REQUESTED'
                ? 'Phản hồi yêu cầu chỉnh sửa'
                : 'Gửi bản phác thảo'}
            </DialogTitle>
          </DialogHeader>

          {order.revisionNote && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">
                Yêu cầu từ khách:
              </p>
              <p className="text-sm italic text-orange-900 dark:text-orange-200">
                "{order.revisionNote}"
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Ảnh phác thảo</Label>
              <SketchUpload
                value={sketchUrl}
                onChange={setSketchUrl}
                label="Tải bản phác thảo lên"
              />
            </div>
            <div>
              <Label htmlFor="artisan-note" className="mb-2 block">Ghi chú của bạn</Label>
              <Textarea
                id="artisan-note"
                placeholder="Mô tả thiết kế, chất liệu, điểm đặc biệt..."
                className="h-28"
                value={artisanNote}
                onChange={(e) => setArtisanNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSketchOpen(false)} disabled={submitSketch.isPending}>
              Hủy
            </Button>
            <Button onClick={() => submitSketch.mutate()} disabled={submitSketch.isPending}>
              {submitSketch.isPending ? 'Đang gửi...' : 'Gửi phác thảo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress dialog */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Thêm cập nhật tiến độ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="prog-title" className="mb-2 block">
                Tiêu đề{' '}
                <span className="text-muted-foreground">({progressTitle.length}/120)</span>
              </Label>
              <Input
                id="prog-title"
                placeholder="VD: Đã hoàn thiện phần thêu tên"
                value={progressTitle}
                onChange={(e) => setProgressTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="prog-note" className="mb-2 block">Ghi chú</Label>
              <Textarea
                id="prog-note"
                placeholder="Mô tả bước đã làm, chất liệu đang dùng..."
                className="h-24"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                maxLength={1000}
              />
            </div>
            <div>
              <Label className="mb-2 block">Ảnh minh họa (tùy chọn)</Label>
              <SketchUpload
                value={progressImageUrl}
                onChange={setProgressImageUrl}
                label="Tải ảnh tiến độ"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProgressOpen(false)} disabled={createProgress.isPending}>
              Hủy
            </Button>
            <Button
              onClick={() => createProgress.mutate()}
              disabled={createProgress.isPending || !progressTitle.trim()}
            >
              {createProgress.isPending ? 'Đang lưu...' : 'Lưu tiến độ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hủy đơn thiết kế</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Bạn có chắc muốn hủy đơn{' '}
            <span className="font-semibold text-foreground">"{order.title}"</span>? Hành động
            này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={cancelOrder.isPending}>
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelOrder.mutate()}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? 'Đang hủy...' : 'Hủy đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
