"use client"

import { useState } from "react"
import { Plus, MapPin, Trash2, CheckCircle2, MoreVertical, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { useAddresses, useAddAddress, useUpdateAddress, useDeleteAddress } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Address } from "@/types"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

interface AddressSectionProps {
  userId: string
}

export function AddressSection({ userId }: AddressSectionProps) {
  const { data: addresses, isLoading } = useAddresses(userId)
  const { mutate: addAddress, isPending: isAdding } = useAddAddress()
  const { mutate: updateAddress, isPending: isUpdating } = useUpdateAddress()
  const { mutate: deleteAddress, isPending: isDeleting } = useDeleteAddress()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    city: "",
    district: "",
    ward: "",
    address: "",
    isDefault: false,
  })

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address)
      setFormData({
        fullName: address.fullName,
        phone: address.phone,
        city: address.city,
        district: address.district,
        ward: address.ward,
        address: address.address,
        isDefault: address.isDefault,
      })
    } else {
      setEditingAddress(null)
      setFormData({
        fullName: "",
        phone: "",
        city: "",
        district: "",
        ward: "",
        address: "",
        isDefault: addresses?.length === 0, // Default to true if first address
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingAddress) {
      updateAddress(
        { userId, addressId: editingAddress.id, data: formData },
        {
          onSuccess: () => {
            toast.success("Cập nhật địa chỉ thành công")
            setIsDialogOpen(false)
          },
          onError: (err: any) => {
            toast.error(err.message || "Không thể cập nhật địa chỉ")
          },
        }
      )
    } else {
      if (addresses && addresses.length >= 5) {
        toast.error("Quý khách chỉ được lưu tối đa 5 địa chỉ")
        return
      }

      addAddress(
        { userId, data: formData },
        {
          onSuccess: () => {
            toast.success("Thêm địa chỉ mới thành công")
            setIsDialogOpen(false)
          },
          onError: (err: any) => {
            toast.error(err.message || "Không thể thêm địa chỉ")
          },
        }
      )
    }
  }

  const handleDelete = (addressId: string) => {
    if (window.confirm("Quý khách có chắc chắn muốn xóa địa chỉ này?")) {
      deleteAddress(
        { userId, addressId },
        {
          onSuccess: () => toast.success("Đã xóa địa chỉ"),
          onError: (err: any) => toast.error(err.message || "Xóa thất bại"),
        }
      )
    }
  }

  const handleSetDefault = (addressId: string) => {
    updateAddress(
      { userId, addressId, data: { isDefault: true } },
      {
        onSuccess: () => toast.success("Đã thay đổi địa chỉ mặc định"),
      }
    )
  }

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
          <h2 className="text-lg font-serif italic text-primary px-4">Sổ Địa Chỉ</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4 rounded-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-all text-[10px] uppercase font-bold tracking-widest disabled:opacity-50"
                onClick={() => handleOpenDialog()}
                disabled={addresses && addresses.length >= 5}
              />
            }
          >
            <Plus className="w-3 h-3 mr-1" />
            Thêm địa chỉ ({addresses?.length || 0}/5)
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-primary">
                {editingAddress ? "Sửa Địa chỉ" : "Thêm Địa chỉ Mới"}
              </DialogTitle>
              <DialogDescription className="italic">
                Cung cấp đầy đủ thông tin để quá trình vận chuyển nghệ phẩm được thuận lợi nhất.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Họ và Tên</Label>
                  <Input 
                    id="fullName" 
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    required 
                    className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Số điện thoại</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    required 
                    className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tỉnh/Thành phố</Label>
                  <Input 
                    id="city" 
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    required 
                    className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Quận/Huyện</Label>
                  <Input 
                    id="district" 
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                    required 
                    className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ward" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Phường/Xã</Label>
                <Input 
                  id="ward" 
                  value={formData.ward}
                  onChange={e => setFormData({ ...formData, ward: e.target.value })}
                  required 
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Địa chỉ cụ thể (Số nhà, đường...)</Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required 
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-primary h-11"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="default"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                />
                <Label htmlFor="default" className="text-xs font-medium text-foreground cursor-pointer">
                  Đặt làm địa chỉ mặc định
                </Label>
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-11 transition-all"
                  disabled={isAdding || isUpdating}
                >
                  {editingAddress ? "Cập nhật Địa chỉ" : "Thêm Địa chỉ"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted/40 animate-pulse rounded-xl border border-border/10"></div>
          ))
        ) : !addresses || addresses.length === 0 ? (
          <div className="md:col-span-2 py-16 text-center bg-muted/5 rounded-2xl border-2 border-dashed border-muted/20">
            <MapPin className="w-12 h-12 text-muted/30 mx-auto mb-4" />
            <p className="text-muted-foreground italic">Quý khách chưa có địa chỉ nào được lưu.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div 
              key={address.id} 
              className={cn(
                "group relative p-6 rounded-2xl border transition-all duration-300",
                address.isDefault 
                  ? "bg-primary/[0.03] border-primary/30 shadow-[0_10px_30px_-10px_rgba(240,78,48,0.1)]" 
                  : "bg-white border-border/40 hover:border-primary/20 hover:shadow-lg"
              )}
            >
              {address.isDefault && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  Mặc định
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-primary">{address.fullName}</h3>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => handleOpenDialog(address)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-foreground/80">
                  <p className="font-semibold text-primary/70">{address.phone}</p>
                  <p className="line-clamp-1">{address.address}</p>
                  <p className="text-muted-foreground">{address.ward}, {address.district}, {address.city}</p>
                </div>

                {!address.isDefault && (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[10px] text-primary font-bold uppercase tracking-widest mt-2 hover:no-underline hover:text-primary/70"
                    onClick={() => handleSetDefault(address.id)}
                  >
                    Thiết lập mặc định
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
