'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import {
  FinancialSummaryPanel,
  LedgerTable,
  RefundDialog,
} from '@/components/dashboard/financial-operations'
import {
  useAdminOrder,
  useAdminOrderLedger,
  useCreateSubOrderTrackingEvent,
  useRefundAdminOrder,
  useSubOrder,
  useUpdateAdminOrderStatus,
  useUpdateSubOrderStatus,
} from '@/lib/api/hooks'
import type { Order, OrderShippingAddress } from '@/types'
import type {
  OrderStatus as ApiOrderStatus,
  PaymentStatus,
} from '@/lib/api/orders'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  getPersonalizationText,
  PersonalizationNote,
} from '@/components/storefront/personalization-note'
import { GiftOptionsNote } from '@/components/storefront/gift-options-note'
import { ShipmentTrackingTimeline } from '@/components/orders/shipment-tracking-timeline'

const ORDER_STATUS_OPTIONS: ApiOrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const CARRIER_OPTIONS = [
  { value: 'GHN', label: 'GHN - Giao Hàng Nhanh' },
  { value: 'GHTK', label: 'GHTK - Giao Hàng Tiết Kiệm' },
  { value: 'Viettel Post', label: 'Viettel Post' },
  { value: 'J&T Express', label: 'J&T Express' },
  { value: 'Ninja Van', label: 'Ninja Van' },
  { value: 'SPX Express', label: 'SPX Express' },
]

const TRACKING_PRESETS = [
  {
    value: 'preparing',
    label: 'Shop đang chuẩn bị hàng',
    title: 'Shop đang chuẩn bị hàng',
    description: 'Sản phẩm đang được kiểm tra, đóng gói và chuẩn bị bàn giao vận chuyển.',
  },
  {
    value: 'packed',
    label: 'Đã đóng gói',
    title: 'Đã đóng gói sản phẩm',
    description: 'Kiện hàng đã được đóng gói cẩn thận, sẵn sàng bàn giao cho đơn vị vận chuyển.',
  },
  {
    value: 'handover',
    label: 'Đã bàn giao vận chuyển',
    title: 'Đã bàn giao cho đơn vị vận chuyển',
    description: 'Kiện hàng đã được bàn giao cho đơn vị vận chuyển. Khách có thể theo dõi bằng mã vận đơn nếu có.',
  },
  {
    value: 'in_transit',
    label: 'Đang trung chuyển',
    title: 'Kiện hàng đang trung chuyển',
    description: 'Kiện hàng đang được vận chuyển giữa các kho xử lý.',
  },
  {
    value: 'out_for_delivery',
    label: 'Đang giao đến khách',
    title: 'Đơn hàng đang được giao',
    description: 'Đơn vị vận chuyển đang giao kiện hàng đến địa chỉ nhận hàng.',
  },
  {
    value: 'delivered',
    label: 'Đã giao thành công',
    title: 'Đã giao hàng thành công',
    description: 'Kiện hàng đã được giao thành công đến khách hàng.',
  },
  {
    value: 'delayed',
    label: 'Giao hàng bị chậm',
    title: 'Giao hàng bị chậm',
    description: 'Kiện hàng bị chậm hơn dự kiến. Shop sẽ tiếp tục theo dõi và cập nhật cho khách.',
  },
]

const LOCATION_OPTIONS = [
  'Shop đang chuẩn bị hàng',
  'Kho shop',
  'Kho Hà Nội',
  'Kho TP. Hồ Chí Minh',
  'Kho Đà Nẵng',
  'Kho phân loại',
  'Đang giao đến khách',
  'Đã giao thành công',
]

const statusClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200',
  PAID: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
  SHIPPED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PAID: 'Đã thanh toán',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  COD_PENDING: 'Chờ thanh toán COD',
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán lỗi',
  PARTIALLY_REFUNDED: 'Đã hoàn tiền một phần',
  REFUNDED: 'Đã hoàn tiền',
}

const refundablePaymentStatuses: PaymentStatus[] = [
  'PAID',
  'PARTIALLY_REFUNDED',
]

function parseShippingAddress(
  shippingAddress: Order['shippingAddress'],
): OrderShippingAddress | null {
  if (!shippingAddress) {
    return null
  }

  if (typeof shippingAddress === 'string') {
    try {
      return JSON.parse(shippingAddress) as OrderShippingAddress
    } catch {
      return null
    }
  }

  return shippingAddress
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${statusClasses[status] || ''} border-0`}>
      {statusLabels[status] || status}
    </Badge>
  )
}

export default function DashboardOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params.id as string
  const isAdmin = user?.roles?.includes('ROLE_ADMIN')
  const isSeller = user?.roles?.includes('ROLE_SELLER')

  const adminOrderQuery = useAdminOrder(id, Boolean(isAdmin))
  const adminOrderLedgerQuery = useAdminOrderLedger(id, Boolean(isAdmin))
  const sellerSubOrderQuery = useSubOrder(id, Boolean(!isAdmin && isSeller))
  const updateAdminOrderStatus = useUpdateAdminOrderStatus()
  const updateSubOrderStatus = useUpdateSubOrderStatus()
  const createTrackingEvent = useCreateSubOrderTrackingEvent()
  const refundAdminOrder = useRefundAdminOrder()

  const order = isAdmin ? adminOrderQuery.data : undefined
  const subOrder = !isAdmin && isSeller ? sellerSubOrderQuery.data : undefined

  const [nextOrderStatus, setNextOrderStatus] =
    useState<ApiOrderStatus | null>(null)
  const [nextSubOrderStatus, setNextSubOrderStatus] =
    useState<ApiOrderStatus | null>(null)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [trackingTitle, setTrackingTitle] = useState('')
  const [trackingDescription, setTrackingDescription] = useState('')
  const [trackingLocation, setTrackingLocation] = useState('')
  const [trackingCarrier, setTrackingCarrier] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [adminTrackingSubOrderId, setAdminTrackingSubOrderId] = useState('')

  const applyTrackingPreset = (presetValue: string | null) => {
    const preset = TRACKING_PRESETS.find((item) => item.value === presetValue)
    if (!preset) {
      return
    }

    setTrackingTitle(preset.title)
    setTrackingDescription(preset.description)
  }

  const activeStatus = useMemo(() => {
    if (order?.status) {
      return order.status
    }

    if (subOrder?.status) {
      return subOrder.status
    }

    return 'PENDING'
  }, [order?.status, subOrder?.status])

  const shippingAddress = parseShippingAddress(
    order?.shippingAddress || subOrder?.order?.shippingAddress || null,
  )
  const financialSummary = order?.financialSummary
  const remainingRefundable = Math.max(
    0,
    Number(financialSummary?.customerPaid || 0) -
      Number(financialSummary?.refundedAmount || 0),
  )
  const canRefundOrder =
    Boolean(isAdmin && order) &&
    order?.paymentMethod === 'STRIPE' &&
    refundablePaymentStatuses.includes(order.paymentStatus as PaymentStatus) &&
    remainingRefundable > 0
  const selectedOrderStatus = nextOrderStatus ?? order?.status ?? 'PENDING'
  const selectedSubOrderStatus = nextSubOrderStatus ?? subOrder?.status ?? 'PENDING'
  const activePaymentStatus = order?.paymentStatus || subOrder?.order?.paymentStatus
  const adminTrackingTargetId =
    adminTrackingSubOrderId || order?.subOrders?.[0]?.id || ''
  const personalizedAdminItems = useMemo(() => {
    if (!order?.subOrders) {
      return []
    }

    return order.subOrders.flatMap((row) =>
      row.items
        .filter((item) => getPersonalizationText(item.personalization))
        .map((item) => ({
          item,
          sellerName: row.seller?.shopName || row.seller?.name || '-',
        })),
    )
  }, [order?.subOrders])

  const isLoading = isAdmin ? adminOrderQuery.isLoading : sellerSubOrderQuery.isLoading
  const error = isAdmin ? adminOrderQuery.error : sellerSubOrderQuery.error

  const handleAdminStatusUpdate = async () => {
    if (!order) {
      return
    }

    try {
      await updateAdminOrderStatus.mutateAsync({
        id: order.id,
        status: selectedOrderStatus,
      })
      toast.success('Đã cập nhật trạng thái đơn hàng')
    } catch (mutationError: unknown) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Không thể cập nhật trạng thái đơn hàng',
      )
    }
  }

  const handleSellerStatusUpdate = async () => {
    if (!subOrder) {
      return
    }

    try {
      await updateSubOrderStatus.mutateAsync({
        id: subOrder.id,
        status: selectedSubOrderStatus,
      })
      toast.success('Đã cập nhật trạng thái kiện hàng')
    } catch (mutationError: unknown) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Không thể cập nhật trạng thái kiện hàng',
      )
    }
  }

  const handleCreateTrackingEvent = async (targetSubOrderId?: string) => {
    const trackingSubOrderId = targetSubOrderId || subOrder?.id

    if (!trackingSubOrderId) {
      toast.error('Vui lòng chọn kiện hàng cần cập nhật')
      return
    }

    const title = trackingTitle.trim()
    if (!title) {
      toast.error('Vui lòng nhập tiêu đề cập nhật vận chuyển')
      return
    }

    try {
      await createTrackingEvent.mutateAsync({
        id: trackingSubOrderId,
        data: {
          title,
          description: trackingDescription.trim() || undefined,
          location: trackingLocation.trim() || undefined,
          carrier: trackingCarrier.trim() || undefined,
          trackingCode: trackingCode.trim() || undefined,
          type: 'INFO',
        },
      })
      setTrackingTitle('')
      setTrackingDescription('')
      setTrackingLocation('')
      setTrackingCarrier('')
      setTrackingCode('')
      setAdminTrackingSubOrderId('')
      toast.success('Đã thêm cập nhật vận chuyển')
    } catch (mutationError: unknown) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Không thể thêm cập nhật vận chuyển',
      )
    }
  }

  const handleAdminRefund = async (data: {
    subOrderId?: string
    amount?: number
    reason: string
  }) => {
    if (!order) {
      return
    }

    try {
      await refundAdminOrder.mutateAsync({ id: order.id, data })
      toast.success('Đã tạo yêu cầu hoàn tiền')
    } catch (mutationError: unknown) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Không thể tạo yêu cầu hoàn tiền',
      )
      throw mutationError
    }
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Bạn không có quyền truy cập trang này.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-sm text-muted-foreground">Đang tải chi tiết đơn hàng...</p>
      </div>
    )
  }

  if (error || (!order && !subOrder)) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500/60" />
        <h2 className="text-xl font-semibold">Không tìm thấy dữ liệu đơn hàng</h2>
        <p className="text-sm text-muted-foreground">
          Kiểm tra lại role đăng nhập và mã đơn hàng.
        </p>
        <Button onClick={() => router.push('/dashboard/orders')}>Quay lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              {isAdmin ? `Đơn hàng #${order?.id.slice(0, 8)}` : `Kiện hàng #${subOrder?.id.slice(0, 8)}`}
            </CardTitle>
            {canRefundOrder && (
              <Button
                className="gap-2"
                onClick={() => setIsRefundDialogOpen(true)}
                disabled={refundAdminOrder.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                Hoàn tiền
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={activeStatus} />
            <span>
              Thanh toán: {order?.paymentMethod || subOrder?.order?.paymentMethod || '-'}
            </span>
            <span>
              Trạng thái thanh toán:{' '}
              {activePaymentStatus
                ? paymentStatusLabels[activePaymentStatus as PaymentStatus] ||
                  activePaymentStatus
                : '-'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Khách hàng
            </h3>
            <p className="font-medium">
              {order?.customer?.name || subOrder?.order?.customer?.name || 'Khách hàng chưa rõ'}
            </p>
            <p className="text-sm text-muted-foreground">
              {order?.customer?.email || subOrder?.order?.customer?.email || '-'}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Giao hàng
            </h3>
            <p className="text-sm">
              {shippingAddress?.street || shippingAddress?.address || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {[shippingAddress?.ward, shippingAddress?.district, shippingAddress?.city]
                .filter(Boolean)
                .join(', ') || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {shippingAddress?.fullName || '-'} | {shippingAddress?.phone || '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      <GiftOptionsNote
        giftWrap={order?.giftWrap ?? subOrder?.order?.giftWrap}
        giftCard={order?.giftCard ?? subOrder?.order?.giftCard}
        giftMessage={order?.giftMessage ?? subOrder?.order?.giftMessage}
        className="bg-card text-card-foreground"
      />

      {isAdmin && order && (
        <FinancialSummaryPanel
          summary={financialSummary}
          remainingRefundable={remainingRefundable}
        />
      )}

      <Card>
        <CardHeader>
            <CardTitle>Cập nhật trạng thái</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            value={isAdmin ? selectedOrderStatus : selectedSubOrderStatus}
            onValueChange={(value) => {
              if (isAdmin) {
                setNextOrderStatus(value as ApiOrderStatus)
                return
              }

              setNextSubOrderStatus(value as ApiOrderStatus)
            }}
          >
            <SelectTrigger className="md:w-72">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin ? (
            <Button
              onClick={handleAdminStatusUpdate}
              disabled={updateAdminOrderStatus.isPending}
            >
              {updateAdminOrderStatus.isPending ? 'Đang lưu...' : 'Cập nhật đơn hàng'}
            </Button>
          ) : (
            <Button
              onClick={handleSellerStatusUpdate}
              disabled={updateSubOrderStatus.isPending}
            >
              {updateSubOrderStatus.isPending ? 'Đang lưu...' : 'Cập nhật kiện hàng'}
            </Button>
          )}
        </CardContent>
      </Card>

      {isAdmin && order && (
        <Card>
          <CardHeader>
            <CardTitle>Kiện hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Người bán</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Số món</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.subOrders?.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">
                        #{row.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {row.seller?.shopName || row.seller?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          Number(row.subTotal || 0) - Number(row.discountAmount || 0),
                        )}
                      </TableCell>
                      <TableCell>{row.items.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 rounded-lg border bg-muted/20 p-4">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Admin can thiệp vận chuyển
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Dùng khi cần hỗ trợ xử lý khiếu nại, bổ sung mã vận đơn hoặc sửa thông tin do người bán cập nhật thiếu. Luồng vận hành chính vẫn thuộc về người bán.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  value={adminTrackingTargetId}
                  onValueChange={(value) => setAdminTrackingSubOrderId(value || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kiện hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {order.subOrders?.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        #{row.id.slice(0, 8)} - {row.seller?.shopName || row.seller?.name || 'Shop'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={trackingCarrier}
                  onValueChange={(value) => setTrackingCarrier(value || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Đơn vị vận chuyển" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={applyTrackingPreset}>
                  <SelectTrigger className="md:col-span-2">
                    <SelectValue placeholder="Chọn mẫu cập nhật nhanh" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKING_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="md:col-span-2"
                  value={trackingTitle}
                  onChange={(event) => setTrackingTitle(event.target.value)}
                  placeholder="Tiêu đề, ví dụ: Đã bàn giao cho đơn vị vận chuyển"
                  maxLength={160}
                />
                <Select
                  value={trackingLocation}
                  onValueChange={(value) => setTrackingLocation(value || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vị trí xử lý" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  placeholder="Mã vận đơn"
                  maxLength={120}
                />
                <Textarea
                  className="md:col-span-2"
                  value={trackingDescription}
                  onChange={(event) => setTrackingDescription(event.target.value)}
                  placeholder="Ghi chú thêm cho khách"
                  maxLength={1000}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => handleCreateTrackingEvent(adminTrackingTargetId)}
                  disabled={createTrackingEvent.isPending || !adminTrackingTargetId}
                >
                  {createTrackingEvent.isPending
                    ? 'Đang lưu...'
                    : 'Thêm cập nhật hỗ trợ'}
                </Button>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {order.subOrders?.map((row) => (
                <div key={`${row.id}-tracking`} className="rounded-lg border p-4">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-semibold">
                        Theo dõi vận chuyển #{row.id.slice(0, 8)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {row.seller?.shopName || row.seller?.name || '-'}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <ShipmentTrackingTimeline
                    events={row.trackingEvents}
                    status={row.status}
                    emptyMessage="Chưa có cập nhật vận chuyển cho kiện hàng này."
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && personalizedAdminItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu cá nhân hóa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {personalizedAdminItems.map(({ item, sellerName }) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Người bán: {sellerName}
                    </p>
                  </div>
                  <PersonalizationNote personalization={item.personalization} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <LedgerTable
          entries={adminOrderLedgerQuery.data}
          isLoading={adminOrderLedgerQuery.isLoading}
        />
      )}

      {!isAdmin && subOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Theo dõi vận chuyển</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ShipmentTrackingTimeline
              events={subOrder.trackingEvents}
              status={subOrder.status}
              emptyMessage="Chưa có cập nhật vận chuyển cho kiện hàng này."
            />

            <div className="rounded-lg border bg-muted/20 p-4">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Cập nhật vận chuyển cho khách
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Người bán cập nhật các mốc đóng gói, bàn giao vận chuyển, mã vận đơn và tình trạng giao hàng của kiện hàng thuộc shop mình.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Select onValueChange={applyTrackingPreset}>
                  <SelectTrigger className="md:col-span-2">
                    <SelectValue placeholder="Chọn mẫu cập nhật nhanh" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKING_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="md:col-span-2">
                  <Input
                    value={trackingTitle}
                    onChange={(event) => setTrackingTitle(event.target.value)}
                    placeholder="Tiêu đề, ví dụ: Đã bàn giao cho đơn vị vận chuyển"
                    maxLength={160}
                  />
                </div>
                <Select
                  value={trackingLocation}
                  onValueChange={(value) => setTrackingLocation(value || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vị trí xử lý" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={trackingCarrier}
                  onValueChange={(value) => setTrackingCarrier(value || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Đơn vị vận chuyển" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_OPTIONS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  placeholder="Mã vận đơn"
                  maxLength={120}
                />
                <Textarea
                  className="md:col-span-2"
                  value={trackingDescription}
                  onChange={(event) => setTrackingDescription(event.target.value)}
                  placeholder="Ghi chú thêm cho khách"
                  maxLength={1000}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => handleCreateTrackingEvent()}
                  disabled={createTrackingEvent.isPending}
                >
                  {createTrackingEvent.isPending
                    ? 'Đang lưu...'
                    : 'Gửi cập nhật cho khách'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdmin && subOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Số lượng: {item.quantity}
                    </p>
                    <PersonalizationNote personalization={item.personalization} compact />
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(Number(item.price) * item.quantity)}
                    </p>
                    <Link
                      href={`/products/${item.product.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Xem sản phẩm
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && order && (
        <RefundDialog
          open={isRefundDialogOpen}
          onOpenChange={setIsRefundDialogOpen}
          onSubmit={handleAdminRefund}
          maxAmount={remainingRefundable}
          isSubmitting={refundAdminOrder.isPending}
          subOrders={order.subOrders}
          title="Hoàn tiền đơn hàng thường"
        />
      )}
    </div>
  )
}
