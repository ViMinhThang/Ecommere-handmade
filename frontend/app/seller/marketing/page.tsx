"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  VoucherDialog,
  type VoucherDialogSavePayload,
} from "@/components/dashboard/voucher-dialog"
import {
  useCategories,
  useCreateSellerVoucher,
  useDeleteSellerVoucher,
  useSellerVouchers,
  useUpdateSellerVoucher,
} from "@/lib/api/hooks"
import { formatCurrency } from "@/lib/utils"
import type { Category, Voucher } from "@/types"
import { Megaphone, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react"

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

type VoucherFormData = VoucherDialogSavePayload

export default function SellerMarketingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)

  const { data: vouchersData, isLoading, isError, refetch } = useSellerVouchers({
    page: 1,
    limit: 50,
  })
  const { data: categoriesData } = useCategories()
  const createVoucher = useCreateSellerVoucher()
  const updateVoucher = useUpdateSellerVoucher()
  const deleteVoucher = useDeleteSellerVoucher()

  const vouchers: Voucher[] = Array.isArray(vouchersData)
    ? vouchersData
    : ((vouchersData as VouchersResponse | undefined)?.data ?? [])
  const categories: Category[] = Array.isArray(categoriesData)
    ? categoriesData
    : ((categoriesData as CategoriesResponse | undefined)?.data ?? [])

  const now = new Date()
  const activeVouchers = vouchers.filter(
    (voucher) => voucher.isActive && new Date(voucher.endDate) > now,
  )
  const expiredVouchers = vouchers.filter(
    (voucher) => new Date(voucher.endDate) <= now,
  )
  const endingSoonVouchers = activeVouchers.filter((voucher) => {
    const daysLeft =
      (new Date(voucher.endDate).getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24)
    return daysLeft <= 7
  })

  const filteredVouchers = vouchers.filter((voucher) => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return true
    return (
      voucher.name.toLowerCase().includes(keyword) ||
      voucher.code.toLowerCase().includes(keyword) ||
      (voucher.description ?? "").toLowerCase().includes(keyword)
    )
  })

  const openCreateDialog = () => {
    setSelectedVoucher(null)
    setDialogOpen(true)
  }

  const openEditDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setDialogOpen(true)
  }

  const openDeleteDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setDeleteDialogOpen(true)
  }

  const handleSaveVoucher = (voucherData: VoucherFormData) => {
    if (selectedVoucher) {
      updateVoucher.mutate(
        { id: selectedVoucher.id, data: voucherData },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật voucher của shop")
            setSelectedVoucher(null)
          },
          onError: () => toast.error("Không thể cập nhật voucher"),
        },
      )
      return
    }

    createVoucher.mutate(voucherData, {
      onSuccess: () => toast.success("Đã tạo voucher cho shop"),
      onError: () => toast.error("Không thể tạo voucher"),
    })
  }

  const handleDeleteVoucher = () => {
    if (!selectedVoucher) return
    deleteVoucher.mutate(selectedVoucher.id, {
      onSuccess: () => {
        toast.success("Đã xóa voucher của shop")
        setSelectedVoucher(null)
        setDeleteDialogOpen(false)
      },
      onError: () => toast.error("Không thể xóa voucher"),
    })
  }

  const isExpired = (voucher: Voucher) =>
    new Date(voucher.endDate).getTime() <= now.getTime()

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Marketing shop</h1>
          <p className="text-muted-foreground">
            Lập kế hoạch mã giảm giá riêng cho gian hàng handmade của bạn.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo voucher shop
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng voucher</p>
            <p className="text-2xl font-bold">{vouchers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang chạy</p>
            <p className="text-2xl font-bold text-green-600">
              {activeVouchers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
            <p className="text-2xl font-bold text-amber-600">
              {endingSoonVouchers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đã hết hạn</p>
            <p className="text-2xl font-bold text-red-600">
              {expiredVouchers.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Gợi ý kế hoạch marketing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="font-medium">Khách mới</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo mã giảm 10% cho đơn đầu tiên trong danh mục bán chạy.
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="font-medium">Xả hàng chậm</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn danh mục tồn kho nhiều và đặt hạn dùng ngắn để dễ demo.
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="font-medium">Quà tặng handmade</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dùng mô tả voucher để nhấn vào dịp sinh nhật, lễ, kỷ niệm.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Voucher riêng của shop</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Tìm voucher..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              Đang tải voucher...
            </div>
          ) : isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              Không tải được voucher của shop.
              <Button
                type="button"
                variant="link"
                className="px-2"
                onClick={() => void refetch()}
              >
                Thử lại
              </Button>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium">Chưa có voucher shop</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo một mã giảm giá riêng để khách có lý do quay lại gian hàng.
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo voucher đầu tiên
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Khoảng giảm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn dùng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
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
                      {voucher.description && (
                        <p className="max-w-xs truncate text-sm text-muted-foreground">
                          {voucher.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{voucher.category?.name ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {voucher.ranges.map((range, index) => (
                          <Badge key={range.id ?? index} variant="secondary">
                            {formatCurrency(Number(range.minPrice))}-
                            {formatCurrency(Number(range.maxPrice))}:{" "}
                            {range.discountPercent}%
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExpired(voucher) ? (
                        <Badge variant="destructive">Hết hạn</Badge>
                      ) : voucher.isActive ? (
                        <Badge>Đang chạy</Badge>
                      ) : (
                        <Badge variant="secondary">Tạm tắt</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(voucher.endDate).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(voucher)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(voucher)}
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
        </CardContent>
      </Card>

      <VoucherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        voucher={selectedVoucher}
        categories={categories}
        onSave={handleSaveVoucher}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xóa voucher shop</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Bạn có chắc muốn xóa voucher{" "}
            <span className="font-semibold text-foreground">
              {selectedVoucher?.name}
            </span>
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
              onClick={handleDeleteVoucher}
              disabled={deleteVoucher.isPending}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
