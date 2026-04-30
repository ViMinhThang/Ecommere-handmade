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
  useAdminOrder,
  useSubOrder,
  useUpdateAdminOrderStatus,
  useUpdateSubOrderStatus,
} from '@/lib/api/hooks'
import type { Order, OrderShippingAddress, SubOrder } from '@/types'
import type { OrderStatus as ApiOrderStatus } from '@/lib/api/orders'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const sellerSubOrderQuery = useSubOrder(id, Boolean(!isAdmin && isSeller))
  const updateAdminOrderStatus = useUpdateAdminOrderStatus()
  const updateSubOrderStatus = useUpdateSubOrderStatus()

  const order = isAdmin ? adminOrderQuery.data : undefined
  const subOrder = !isAdmin && isSeller ? sellerSubOrderQuery.data : undefined

  const [nextOrderStatus, setNextOrderStatus] = useState<ApiOrderStatus>('PENDING')
  const [nextSubOrderStatus, setNextSubOrderStatus] =
    useState<ApiOrderStatus>('PENDING')

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

  const isLoading = isAdmin ? adminOrderQuery.isLoading : sellerSubOrderQuery.isLoading
  const error = isAdmin ? adminOrderQuery.error : sellerSubOrderQuery.error

  useEffect(() => {
    if (order?.status) {
      setNextOrderStatus(order.status)
    }
  }, [order?.status])

  useEffect(() => {
    if (subOrder?.status) {
      setNextSubOrderStatus(subOrder.status)
    }
  }, [subOrder?.status])

  const handleAdminStatusUpdate = async () => {
    if (!order) {
      return
    }

    try {
      await updateAdminOrderStatus.mutateAsync({
        id: order.id,
        status: nextOrderStatus,
      })
      toast.success('Order status updated')
    } catch (mutationError: unknown) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Could not update order status',
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
        status: nextSubOrderStatus,
      })
      toast.success('Sub-order status updated')
    } catch (mutationError: unknown) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Could not update sub-order status',
      )
    }
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Ban khong co quyen truy cap trang nay.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-sm text-muted-foreground">Dang tai chi tiet don hang...</p>
      </div>
    )
  }

  if (error || (!order && !subOrder)) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500/60" />
        <h2 className="text-xl font-semibold">Khong tim thay du lieu don hang</h2>
        <p className="text-sm text-muted-foreground">
          Kiem tra lai role dang nhap va ID don hang.
        </p>
        <Button onClick={() => router.push('/dashboard/orders')}>Quay lai</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>
            {isAdmin ? `Order #${order?.id.slice(0, 8)}` : `Sub-order #${subOrder?.id.slice(0, 8)}`}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={activeStatus} />
            <span>
              Payment: {order?.paymentMethod || subOrder?.order?.paymentMethod || '-'}
            </span>
            <span>
              Payment status:{' '}
              {order?.paymentStatus || subOrder?.order?.paymentStatus || '-'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Customer
            </h3>
            <p className="font-medium">
              {order?.customer?.name || subOrder?.order?.customer?.name || 'Unknown'}
            </p>
            <p className="text-sm text-muted-foreground">
              {order?.customer?.email || subOrder?.order?.customer?.email || '-'}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Shipping
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

      <Card>
        <CardHeader>
          <CardTitle>Status update</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select
            value={isAdmin ? nextOrderStatus : nextSubOrderStatus}
            onValueChange={(value) => {
              if (isAdmin) {
                setNextOrderStatus(value as ApiOrderStatus)
                return
              }

              setNextSubOrderStatus(value as ApiOrderStatus)
            }}
          >
            <SelectTrigger className="md:w-72">
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

          {isAdmin ? (
            <Button
              onClick={handleAdminStatusUpdate}
              disabled={updateAdminOrderStatus.isPending}
            >
              {updateAdminOrderStatus.isPending ? 'Saving...' : 'Update order'}
            </Button>
          ) : (
            <Button
              onClick={handleSellerStatusUpdate}
              disabled={updateSubOrderStatus.isPending}
            >
              {updateSubOrderStatus.isPending ? 'Saving...' : 'Update sub-order'}
            </Button>
          )}
        </CardContent>
      </Card>

      {isAdmin && order && (
        <Card>
          <CardHeader>
            <CardTitle>Sub-orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Items</TableHead>
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

      {!isAdmin && subOrder && (
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
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
                      Qty: {item.quantity}
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
                      View product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
