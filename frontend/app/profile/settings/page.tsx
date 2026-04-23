"use client"

import { useEffect, useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Save, User as UserIcon, Camera } from "lucide-react"
import Image from "next/image"
import { useMe, useUpdateProfile, useFolders, useCreateFolder, useUploadImage } from "@/lib/api/hooks"
import { mediaApi } from "@/lib/api/media"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AddressSection } from "@/components/profile/address-section"

const profileSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z.string().optional(),
  shopName: z.string().optional(),
  sellerTitle: z.string().optional(),
  sellerBio: z.string().optional(),
  sellerAbout: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { data: user, isLoading: isLoadingUser } = useMe()
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile()
  const { data: folders } = useFolders(user?.id || "")
  const { mutateAsync: createFolder } = useCreateFolder()
  const { mutateAsync: uploadImage, isPending: isUploadingImage } = useUploadImage()
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      shopName: "",
      sellerTitle: "",
      sellerBio: "",
      sellerAbout: "",
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        phone: user.phone || "",
        shopName: user.shopName || "",
        sellerTitle: user.sellerTitle || "",
        sellerBio: user.sellerBio || "",
        sellerAbout: user.sellerAbout || "",
      })
    }
  }, [user, form])

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile(data, {
      onSuccess: () => {
        toast.success("Hồ sơ đã được cập nhật thành công")
      },
      onError: (error: any) => {
        toast.error(error.message || "Cập nhật hồ sơ thất bại")
      },
    })
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      // 1. Tìm hoặc tạo thư mục "Hồ sơ"
      let profileFolder = folders?.find(f => f.name === "Hồ sơ")
      
      if (!profileFolder) {
        profileFolder = await createFolder({ 
          userId: user.id, 
          data: { name: "Hồ sơ" } 
        })
      }

      // 2. Tải ảnh lên
      const uploadedImage = await uploadImage({
        folderId: profileFolder.id,
        file,
        displayName: `Avatar-${user.name}-${Date.now()}`
      })

      // 3. Cập nhật hồ sơ với đường dẫn ảnh mới
      updateProfile({ avatar: uploadedImage.path }, {
        onSuccess: () => {
          toast.success("Ảnh đại diện đã được cập nhật")
        }
      })
    } catch (error: any) {
      toast.error(error.message || "Không thể tải ảnh lên")
    }
  }

  if (isLoadingUser) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2">Chi tiết Hồ sơ</h1>
        <p className="text-muted-foreground italic">Quản lý thông tin cá nhân và thông tin người bán của quý khách.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
        {/* Profile Header / Avatar Section */}
        <section className="bg-white rounded-xl p-8 shadow-[0_20px_40px_-20px_rgba(84,67,60,0.1)] border border-border/30">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative group">
              <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/10 shadow-inner relative">
                {user?.avatar ? (
                  <Image 
                    src={mediaApi.getImageUrl(user.avatar)} 
                    alt={user.name || "Avatar"} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <UserIcon className="w-16 h-16 text-muted-foreground/30" />
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              <button 
                type="button" 
                onClick={handleAvatarClick}
                disabled={isUploadingImage}
                className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 space-y-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Họ và Tên</Label>
                  <input
                    id="name"
                    {...form.register("name")}
                    className="input-minimal"
                    placeholder="Nhập tên của quý khách"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Địa chỉ Email</Label>
                  <input
                    value={user?.email || ""}
                    disabled
                    className="input-minimal opacity-60 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Email không thể thay đổi để bảo mật tài khoản.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Address Section */}
        <AddressSection userId={user?.id || ""} />

        {/* Seller Specific Info */}
        {user?.roles?.includes("ROLE_SELLER") && (
          <section className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
              <h2 className="text-lg font-serif italic text-primary px-4">Thông tin Người bán</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tên Cửa hàng</Label>
                <input
                  id="shopName"
                  {...form.register("shopName")}
                  className="input-minimal"
                  placeholder="Ví dụ: Terra & Thread"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Số điện thoại Liên hệ</Label>
                <input
                  id="phone"
                  {...form.register("phone")}
                  className="input-minimal"
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="sellerTitle" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tiêu đề Nghề nghiệp</Label>
                <input
                  id="sellerTitle"
                  {...form.register("sellerTitle")}
                  className="input-minimal"
                  placeholder="Ví dụ: Chuyên gia Gốm thủ công"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="sellerBio" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tiểu sử Ngắn</Label>
                <input
                  id="sellerBio"
                  {...form.register("sellerBio")}
                  className="input-minimal"
                  placeholder="Một câu tóm tắt về phong cách nghệ thuật của quý khách"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="sellerAbout" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Giới thiệu Chi tiết</Label>
                <textarea
                  id="sellerAbout"
                  {...form.register("sellerAbout")}
                  rows={5}
                  className="w-full bg-transparent border border-border/40 rounded-lg px-4 py-3 text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300 outline-none resize-none"
                  placeholder="Chia sẻ câu chuyện và đam mê sáng tạo của quý khách với cộng đồng..."
                />
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-end pt-6">
          <button 
            type="submit" 
            disabled={isUpdating}
            className="btn-artisanal group"
          >
            {isUpdating ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            )}
            Lưu Thay đổi Hồ sơ
          </button>
        </div>
      </form>
    </div>
  )
}
