"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customOrdersApi, CustomOrder } from "@/lib/api/custom-orders";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Plus, PenTool, Package, CheckCircle, Truck, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SketchUpload } from "@/components/dashboard/sketch-upload";

const statusClasses: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
  AWAITING_PAYMENT: 'bg-blue-100 text-blue-800',
  CRAFTING: 'bg-green-100 text-green-800',
  FINISHING: 'bg-teal-100 text-teal-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản thảo',
  PENDING_REVIEW: 'Chờ khách duyệt',
  REVISION_REQUESTED: 'Yêu cầu sửa',
  AWAITING_PAYMENT: 'Chờ thanh toán',
  CRAFTING: 'Đang chế tác',
  FINISHING: 'Đang hoàn thiện',
  SHIPPED: 'Đã giao hàng',
};

export default function SellerCustomOrdersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [sketchUrl, setSketchUrl] = useState("");
  const [responseNote, setResponseNote] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["customOrders", "seller"],
    queryFn: () => customOrdersApi.getSellerOrders()
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomOrder['status'] }) => 
      customOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      void queryClient.invalidateQueries({ queryKey: ["customOrders", "seller"] });
    },
    onError: () => {
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  });

  const submitRevision = useMutation({
    mutationFn: (data: { id: string; sketchImageUrl: string; artisanNote: string }) => 
      customOrdersApi.updateSketch(data.id, { 
        sketchImageUrl: data.sketchImageUrl, 
        artisanNote: data.artisanNote 
      }),
    onSuccess: () => {
      toast.success("Đã gửi bản phác thảo cập nhật");
      setIsRevisionOpen(false);
      setSelectedOrder(null);
      void queryClient.invalidateQueries({ queryKey: ["customOrders", "seller"] });
    },
    onError: () => {
      toast.error("Lỗi khi cập nhật phác thảo");
    }
  });

  const filteredOrders = (orders || []).filter(order => 
    order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNextStatus = (order: CustomOrder) => {
    let nextStatus: CustomOrder['status'] | null = null;
    if (order.status === 'CRAFTING') nextStatus = 'FINISHING';
    else if (order.status === 'FINISHING') nextStatus = 'SHIPPED';
    
    if (nextStatus) {
      updateStatus.mutate({ id: order.id, status: nextStatus });
    }
  };

  const handleOpenRevision = (order: CustomOrder) => {
    setSelectedOrder(order);
    setSketchUrl(order.sketchImageUrl || "");
    setResponseNote(order.artisanNote || "");
    setIsRevisionOpen(true);
  };

  const handleSubmitRevision = () => {
    if (!selectedOrder) return;
    submitRevision.mutate({
      id: selectedOrder.id,
      sketchImageUrl: sketchUrl,
      artisanNote: responseNote
    });
  };

  return (
    <div className='space-y-7'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='artisan-title text-4xl'>Đơn hàng thiết kế</h1>
          <p className='artisan-subtitle mt-2'>Quản lý các bản thiết kế riêng và tiến độ sản phẩm độc bản.</p>
        </div>
        <Link href="/seller/custom-orders/new">
          <Button className="gap-2 bg-[#A35C3D] hover:bg-[#8a4d33]">
            <Plus className="h-4 w-4" />
            Tạo thiết kế mới
          </Button>
        </Link>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Tổng thiết kế</p>
            <p className='text-2xl font-bold'>{orders?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Đang chế tác</p>
            <p className='text-2xl font-bold'>
              {orders?.filter(o => o.status === 'CRAFTING').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Chờ thanh toán</p>
            <p className='text-2xl font-bold'>
              {orders?.filter(o => o.status === 'AWAITING_PAYMENT').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Đã bàn giao</p>
            <p className='text-2xl font-bold'>
              {orders?.filter(o => o.status === 'SHIPPED').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Danh sách thiết kế riêng</CardTitle>
            <div className='flex items-center gap-2'>
              <div className='relative w-64'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input 
                  placeholder='Tìm kiếm thiết kế...' 
                  className='pl-9' 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
          ) : filteredOrders.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground'>
              <Package className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>Không thấy đơn thiết kế nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className='font-mono text-xs text-muted-foreground'>
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold">{order.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{order.customer?.name}</span>
                        <span className="text-xs text-muted-foreground">{order.customer?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-[#A35C3D]">
                      {formatCurrency(Number(order.price))}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusClasses[order.status] || ''}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         {order.status === 'REVISION_REQUESTED' && (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-8 gap-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                             onClick={() => handleOpenRevision(order)}
                           >
                             <RefreshCcw className="h-3 w-3" />
                             Phản hồi yêu cầu
                           </Button>
                         )}
                         {order.status === 'CRAFTING' && (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-8 gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                             onClick={() => handleNextStatus(order)}
                             disabled={updateStatus.isPending}
                           >
                             <CheckCircle className="h-3 w-3" />
                             Bắt đầu hoàn thiện
                           </Button>
                         )}
                         {order.status === 'FINISHING' && (
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-8 gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                             onClick={() => handleNextStatus(order)}
                             disabled={updateStatus.isPending}
                           >
                             <Truck className="h-3 w-3" />
                             Giao hàng
                           </Button>
                         )}
                        <Link href={`/custom-orders/${order.id}/review`}>
                          <Button variant='ghost' size='icon' className="h-8 w-8">
                            <Eye className='h-4 w-4 text-muted-foreground' />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRevisionOpen} onOpenChange={setIsRevisionOpen}>
        <DialogContent className="max-w-xl text-slate-900">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Cập nhật bản phác thảo</DialogTitle>
            <DialogDescription>
              Đáp lại yêu cầu chỉnh sửa từ khách hàng.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder?.revisionNote && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4">
              <Label className="text-orange-800 font-bold mb-1 block">Yêu cầu từ khách hàng:</Label>
              <p className="text-sm text-orange-900 italic">"{selectedOrder.revisionNote}"</p>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ảnh phác thảo mới</Label>
              <SketchUpload 
                value={sketchUrl} 
                onChange={(url) => setSketchUrl(url)} 
                label="Tải ảnh phác thảo mới"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artisanNote">Ghi chú từ người bán</Label>
              <Textarea 
                id="artisanNote" 
                placeholder="Giải thích các thay đổi bạn đã thực hiện cho bản thiết kế này..."
                className="h-32"
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevisionOpen(false)}>Hủy</Button>
            <Button 
              className="bg-[#A35C3D] hover:bg-[#8a4d33]"
              onClick={handleSubmitRevision}
              disabled={submitRevision.isPending}
            >
              {submitRevision.isPending ? "Đang gửi bản cập nhật..." : "Gửi bản cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
