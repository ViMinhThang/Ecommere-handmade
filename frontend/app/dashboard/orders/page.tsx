/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Search, 
  Eye, 
  Package, 
  Edit, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useSellerOrders, useUpdateSubOrderStatus } from '@/lib/api/hooks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import Link from 'next/link'

const statusClasses: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  REVISION_REQUESTED: 'bg-purple-100 text-purple-800',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800',
  CRAFTING: 'bg-blue-100 text-blue-800',
  FINISHING: 'bg-indigo-100 text-indigo-800',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PAID: 'Đã thanh toán',
  PROCESSING: 'Đang chuẩn bị',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  PENDING_REVIEW: 'Chờ duyệt',
  REVISION_REQUESTED: 'Yêu cầu sửa',
  AWAITING_PAYMENT: 'Chờ khách trả tiền',
  CRAFTING: 'Đang chế tác',
  FINISHING: 'Hoàn thiện',
}

type OrderStatus = keyof typeof statusLabels;

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')

  const { data: subOrders, isLoading, error } = useSellerOrders()
  const updateStatusMutation = useUpdateSubOrderStatus()

  const handleUpdateClick = (subOrder: any) => {
    setSelectedOrder(subOrder)
    setNewStatus(subOrder.status)
    setIsUpdateModalOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return

    try {
      await updateStatusMutation.mutateAsync({
        id: selectedOrder.id,
        status: newStatus,
      })
      toast.success("Cập nhật trạng thái thành công")
      setIsUpdateModalOpen(false)
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái")
    }
  }

  const filteredOrders = subOrders?.filter(subOrder => {
    const matchesSearch = 
      subOrder.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subOrder.order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  }) || []

  const stats = {
    total: subOrders?.length || 0,
    paid: subOrders?.filter(o => o.status === 'PAID').length || 0,
    processing: subOrders?.filter(o => o.status === 'PROCESSING').length || 0,
    delivered: subOrders?.filter(o => o.status === 'DELIVERED').length || 0,
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="artisan-subtitle italic">Đang tải danh sách đơn hàng...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500/50" />
        <h3 className="text-xl font-bold">Đã xảy ra lỗi</h3>
        <p className="text-muted-foreground">Không thể tải danh sách đơn hàng từ máy chủ.</p>
        <Button onClick={() => window.location.reload()}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className='space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='artisan-title text-4xl'>Quản lý Đơn hàng</h1>
          <p className='artisan-subtitle mt-2 text-stone-500'>Theo dõi và cập nhật trạng thái vận chuyển các tác phẩm của bạn.</p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card className="border-border/50 shadow-sm">
          <CardContent className='p-5'>
            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1'>Tổng đơn hàng</p>
            <p className='text-3xl font-serif text-primary font-bold'>{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className='p-5'>
            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1'>Chờ chuẩn bị</p>
            <div className="flex items-baseline gap-2">
              <p className='text-3xl font-serif text-amber-600 font-bold'>{stats.paid}</p>
              <span className="text-xs italic text-muted-foreground">(Đã thanh toán)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className='p-5'>
            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1'>Đang thực hiện</p>
            <p className='text-3xl font-serif text-blue-600 font-bold'>{stats.processing}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className='p-5'>
            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1'>Hoàn tất</p>
            <p className='text-3xl font-serif text-green-600 font-bold'>{stats.delivered}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-md">
        <CardHeader className="pb-4">
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <CardTitle className="font-serif italic text-2xl text-primary">Danh sách Kiện hàng</CardTitle>
            <div className='relative w-full md:w-80'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input 
                placeholder='Tìm mã kiện hoặc khách hàng...' 
                className='pl-9 bg-muted/30' 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className='text-center py-20 text-muted-foreground'>
              <Package className='h-16 w-16 mx-auto mb-4 opacity-10' />
              <h3 className="font-serif text-xl mb-1">Không có đơn hàng nào</h3>
              <p className="text-sm">Khi có khách hàng mua tác phẩm của bạn, chúng sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Mã kiện</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Khách hàng</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Vật phẩm</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Giá trị</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Trạng thái</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Ngày đặt</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((subOrder: any) => (
                    <TableRow key={subOrder.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className='font-mono text-xs'>
                        <div className="flex flex-col gap-1">
                          <span>#{subOrder.id.slice(0, 8)}</span>
                          {subOrder.type === 'CUSTOM' && (
                            <span className="text-[9px] font-bold text-primary uppercase">Custom</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{(subOrder.order as any).customer.name}</span>
                          <span className="text-[10px] text-muted-foreground">{(subOrder.order as any).customer.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <div className="w-10 h-10 rounded border border-border/30 overflow-hidden bg-muted shrink-0">
                            {subOrder.items?.[0]?.product?.images?.find((img: any) => img.isMain)?.url || subOrder.items?.[0]?.product?.images?.[0]?.url ? (
                              <img 
                                src={subOrder.items[0].product.images?.[0]?.url} 
                                alt="" 
                                className='w-full h-full object-cover' 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 opacity-20" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className='text-sm font-medium line-clamp-1 max-w-[180px]'>
                              {subOrder.items?.[0]?.product?.name || 'Vật phẩm'}
                            </span>
                            {subOrder.items.length > 1 && (
                              <span className="text-[10px] text-muted-foreground italic">+ {subOrder.items.length - 1} món khác</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-serif italic">{formatCurrency(subOrder.subTotal)}</TableCell>
                      <TableCell>
                        <Badge className={`${statusClasses[subOrder.status] || ''} border-0 font-bold text-[10px] tracking-widest`}>
                          {statusLabels[subOrder.status] || subOrder.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(subOrder.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant='ghost' 
                            size='icon' 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleUpdateClick(subOrder)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Link href={subOrder.type === 'CUSTOM' ? `/custom-orders/${subOrder.id}/review` : `/dashboard/orders/${subOrder.id}`}>
                            <Button variant='ghost' size='icon' className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Eye className='h-4 w-4' />
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

      {/* Status Update Confirmation Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Cập nhật Trạng thái</DialogTitle>
            <DialogDescription className="italic">
              Thay đổi trạng thái cho kiện hàng #{selectedOrder?.id?.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">
              Trạng thái mới
            </label>
            <Select value={newStatus} onValueChange={(val) => val && setNewStatus(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUpdateModalOpen(false)}
              className="text-xs uppercase tracking-widest font-bold"
            >
              Hủy bỏ
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={updateStatusMutation.isPending}
              className="btn-artisanal py-2 px-6 text-xs uppercase tracking-widest font-bold"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Xác nhận Cập nhật"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
