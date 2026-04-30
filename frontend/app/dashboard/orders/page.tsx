'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import {
  useAdminOrders,
  useSellerOrders,
  useUpdateSubOrderStatus,
} from '@/lib/api/hooks'
import type {
  AdminOrderFilters,
  OrderStatus as ApiOrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/api/orders'
import type { Order, SubOrder } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, Eye, Loader2, Package, Search } from 'lucide-react'
import { toast } from 'sonner'

const ORDER_STATUS_OPTIONS: ApiOrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['COD', 'STRIPE']
const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  'COD_PENDING',
  'UNPAID',
  'PAID',
  'FAILED',
]

const statusClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Cho xac nhan',
  PAID: 'Da thanh toan',
  PROCESSING: 'Dang xu ly',
  SHIPPED: 'Dang giao',
  DELIVERED: 'Da giao',
  CANCELLED: 'Da huy',
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: 'COD',
  STRIPE: 'Stripe',
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  COD_PENDING: 'COD pending',
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  FAILED: 'Failed',
}

function getCustomerName(order: Order) {
  return order.customer?.name || 'Unknown customer'
}

function getCustomerEmail(order: Order) {
  return order.customer?.email || '-'
}

function getOrderSellerSummary(order: Order) {
  const names = Array.from(
    new Set(
      (order.subOrders || [])
        .map((subOrder) => subOrder.seller?.shopName || subOrder.seller?.name)
        .filter(Boolean),
    ),
  )

  return names.join(', ') || '-'
}

function getOrderItemCount(order: Order) {
  return (order.subOrders || []).reduce(
    (count, subOrder) => count + subOrder.items.length,
    0,
  )
}

export default function OrdersPage() {
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('ROLE_ADMIN')
  const isSeller = user?.roles?.includes('ROLE_SELLER')

  const [searchQuery, setSearchQuery] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApiOrderStatus>('ALL')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    'ALL' | PaymentMethod
  >('ALL')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    'ALL' | PaymentStatus
  >('ALL')
  const [selectedSubOrder, setSelectedSubOrder] = useState<SubOrder | null>(null)
  const [nextStatus, setNextStatus] = useState<ApiOrderStatus>('PENDING')
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)

  const adminFilters: AdminOrderFilters = {
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    paymentMethod:
      paymentMethodFilter === 'ALL' ? undefined : paymentMethodFilter,
    paymentStatus:
      paymentStatusFilter === 'ALL' ? undefined : paymentStatusFilter,
    customer: customerFilter || undefined,
    seller: sellerFilter || undefined,
  }

  const adminOrdersQuery = useAdminOrders(adminFilters, Boolean(isAdmin))
  const sellerOrdersQuery = useSellerOrders(Boolean(isSeller && !isAdmin))
  const updateSubOrderStatus = useUpdateSubOrderStatus()

  const adminOrders = useMemo(() => {
    const source = adminOrdersQuery.data || []
    return source.filter((order) =>
      order.id.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [adminOrdersQuery.data, searchQuery])

  const sellerOrders = useMemo(() => {
    const source = (sellerOrdersQuery.data || []) as Array<
      SubOrder & { type?: string }
    >
    const normalizedSearch = searchQuery.trim().toLowerCase()

    if (!normalizedSearch) {
      return source
    }

    return source.filter((subOrder) => {
      const customerName = subOrder.order?.customer?.name?.toLowerCase() || ''
      const sellerName = subOrder.seller?.shopName?.toLowerCase() || ''

      return (
        subOrder.id.toLowerCase().includes(normalizedSearch) ||
        customerName.includes(normalizedSearch) ||
        sellerName.includes(normalizedSearch)
      )
    })
  }, [searchQuery, sellerOrdersQuery.data])

  const stats = useMemo(() => {
    if (isAdmin) {
      const total = adminOrders.length
      return {
        total,
        pending: adminOrders.filter((order) => order.status === 'PENDING').length,
        processing: adminOrders.filter((order) => order.status === 'PROCESSING')
          .length,
        delivered: adminOrders.filter((order) => order.status === 'DELIVERED')
          .length,
      }
    }

    const total = sellerOrders.length
    return {
      total,
      pending: sellerOrders.filter((order) => order.status === 'PENDING').length,
      processing: sellerOrders.filter((order) => order.status === 'PROCESSING')
        .length,
      delivered: sellerOrders.filter((order) => order.status === 'DELIVERED')
        .length,
    }
  }, [adminOrders, isAdmin, sellerOrders])

  const isLoading = isAdmin ? adminOrdersQuery.isLoading : sellerOrdersQuery.isLoading
  const error = isAdmin ? adminOrdersQuery.error : sellerOrdersQuery.error

  const openSellerStatusDialog = (subOrder: SubOrder & { type?: string }) => {
    if (subOrder.type === 'CUSTOM') {
      return
    }

    setSelectedSubOrder(subOrder)
    setNextStatus(subOrder.status)
    setIsStatusDialogOpen(true)
  }

  const handleSellerStatusUpdate = async () => {
    if (!selectedSubOrder) {
      return
    }

    try {
      await updateSubOrderStatus.mutateAsync({
        id: selectedSubOrder.id,
        status: nextStatus,
      })
      toast.success('Cap nhat trang thai thanh cong')
      setIsStatusDialogOpen(false)
    } catch (mutationError: unknown) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : 'Khong the cap nhat trang thai'
      toast.error(message)
    }
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Ban khong co quyen truy cap trang quan ly don hang.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-sm text-muted-foreground">Dang tai du lieu don hang...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500/60" />
        <h3 className="text-xl font-semibold">Khong the tai don hang</h3>
        <p className="text-sm text-muted-foreground">
          Vui long thu lai sau khi kiem tra quyen truy cap va ket noi API.
        </p>
        <Button onClick={() => window.location.reload()}>Thu lai</Button>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold text-primary">
          {isAdmin ? 'Admin orders' : 'Seller orders'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Xem, loc va kiem tra toan bo don hang he thong.'
            : 'Theo doi cac sub-order thuoc shop cua ban.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Tong don
            </p>
            <p className="mt-2 text-3xl font-bold text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Pending
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Processing
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats.processing}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Delivered
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.delivered}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>{isAdmin ? 'Order list' : 'Sub-order list'}</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={isAdmin ? 'Search order id...' : 'Search sub-order or customer...'}
                className="pl-9"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="grid gap-3 md:grid-cols-5">
              <Input
                value={customerFilter}
                onChange={(event) => setCustomerFilter(event.target.value)}
                placeholder="Filter customer"
              />
              <Input
                value={sellerFilter}
                onChange={(event) => setSellerFilter(event.target.value)}
                placeholder="Filter seller"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as 'ALL' | ApiOrderStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All status</SelectItem>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={paymentMethodFilter}
                onValueChange={(value) =>
                  setPaymentMethodFilter(value as 'ALL' | PaymentMethod)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All methods</SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((paymentMethod) => (
                    <SelectItem key={paymentMethod} value={paymentMethod}>
                      {paymentMethodLabels[paymentMethod]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={paymentStatusFilter}
                onValueChange={(value) =>
                  setPaymentStatusFilter(value as 'ALL' | PaymentStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All payment status</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((paymentStatus) => (
                    <SelectItem key={paymentStatus} value={paymentStatus}>
                      {paymentStatusLabels[paymentStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            adminOrders.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Package className="mx-auto mb-4 h-14 w-14 opacity-20" />
                <p>No orders match the current filters.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sellers</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {getCustomerName(order)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getCustomerEmail(order)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getOrderSellerSummary(order)}
                        </TableCell>
                        <TableCell>{getOrderItemCount(order)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(order.totalAmount || 0))}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <span>{order.paymentMethod || '-'}</span>
                            <span className="text-muted-foreground">
                              {order.paymentStatus || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusClasses[order.status] || ''} border-0`}
                          >
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : sellerOrders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="mx-auto mb-4 h-14 w-14 opacity-20" />
              <p>Chua co sub-order nao cho shop cua ban.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub-order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerOrders.map((subOrder) => (
                    <TableRow key={subOrder.id}>
                      <TableCell className="font-mono text-xs">
                        #{subOrder.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {subOrder.order?.customer?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {subOrder.order?.customer?.email || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <span>{subOrder.order?.paymentMethod || '-'}</span>
                          <span className="text-muted-foreground">
                            {subOrder.order?.paymentStatus || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusClasses[subOrder.status] || ''} border-0`}
                        >
                          {statusLabels[subOrder.status] || subOrder.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(
                          Number(subOrder.subTotal || 0) -
                            Number(subOrder.discountAmount || 0),
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(subOrder.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSellerStatusDialog(subOrder)}
                            disabled={subOrder.type === 'CUSTOM'}
                          >
                            Update
                          </Button>
                          <Link
                            href={
                              subOrder.type === 'CUSTOM'
                                ? `/custom-orders/${subOrder.id}/review`
                                : `/dashboard/orders/${subOrder.id}`
                            }
                          >
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update sub-order status</DialogTitle>
            <DialogDescription>
              Seller chi duoc cap nhat sub-order thuoc shop cua minh.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={nextStatus}
              onValueChange={(value) => setNextStatus(value as ApiOrderStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSellerStatusUpdate}
              disabled={updateSubOrderStatus.isPending}
            >
              {updateSubOrderStatus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
