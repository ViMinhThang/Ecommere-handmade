'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useAuth } from '@/contexts/auth-context'
import {
  FinancialSummaryPanel,
  LedgerTable,
  RefundDialog,
} from '@/components/dashboard/financial-operations'
import {
  useAdminOrder,
  useAdminOrderLedger,
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

const ORDER_STATUS_OPTIONS: ApiOrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
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
  const refundAdminOrder = useRefundAdminOrder()

  const order = isAdmin ? adminOrderQuery.data : undefined
  const subOrder = !isAdmin && isSeller ? sellerSubOrderQuery.data : undefined

  const [nextOrderStatus, setNextOrderStatus] =
    useState<ApiOrderStatus | null>(null)
  const [nextSubOrderStatus, setNextSubOrderStatus] =
    useState<ApiOrderStatus | null>(null)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)

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
