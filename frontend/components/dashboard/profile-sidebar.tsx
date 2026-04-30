"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"
import { mediaApi } from "@/lib/api/media"
import { 
  User as UserIcon, 
  CreditCard, 
  ShoppingBag, 
  Heart, 
  Settings,
  ExternalLink,
  LogOut,
  PenTool
} from "lucide-react"

export function ProfileSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  const isSeller = user?.roles?.includes("ROLE_SELLER")

  const navItems = [
    { href: "/profile/settings", label: "Chi tiết hồ sơ", icon: UserIcon },
    { href: "/profile/payments", label: "Phương thức thanh toán", icon: CreditCard },
    { href: "/profile/orders", label: "Lịch sử đơn hàng", icon: ShoppingBag },
    { href: "/profile/custom-orders", label: "Đồ thiết kế riêng", icon: PenTool },
    { href: "/profile/wishlist", label: "Danh sách yêu thích", icon: Heart },
    { href: "/profile/account", label: "Cài đặt tài khoản", icon: Settings },
  ]

  if (isAdmin || isSeller) {
    navItems.push({ href: "/dashboard", label: "Bảng điều khiển", icon: ExternalLink })
  }

  const registrationYear =
    user && "createdAt" in user && user.createdAt
      ? new Date(user.createdAt as string | number | Date).getFullYear()
      : 2023

  return (
    <aside className="w-full md:w-72 flex-shrink-0 bg-muted/30 min-h-[600px] rounded-lg overflow-hidden border border-border/40">
      <div className="p-8 pt-10">
        <div className="mb-10">
          <div className="w-20 h-20 bg-accent rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-border/50 shadow-sm relative">
            {user?.avatar ? (
              <Image 
                src={mediaApi.getImageUrl(user.avatar)} 
                alt={user.name || "Avatar"} 
                fill 
                className="object-cover" 
              />
            ) : (
              <UserIcon className="w-10 h-10 text-muted-foreground/40" />
            )}
          </div>
          <h2 className="font-serif font-bold text-primary text-xl tracking-tight">{user?.name || "Người bán"}</h2>
          <p className="text-xs text-muted-foreground mb-4 font-medium italic">
            Người bán từ năm {registrationYear}
          </p>
          <Link 
            href={`/sellers/${user?.id}`} 
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary tracking-widest uppercase hover:underline transition-all"
          >
            Xem hồ sơ công khai
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <nav className="space-y-1 -mx-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-8 py-3.5 text-sm font-medium transition-all duration-300 border-l-4",
                  isActive
                    ? "text-primary bg-white/60 border-primary shadow-[inset_0_0_20px_rgba(133,57,45,0.03)]"
                    : "text-muted-foreground border-transparent hover:bg-white/30 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-4.5 h-4.5 mr-3.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground/60")} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-10 pt-10 border-t border-border/40 -mx-8 px-8">
          <button
            onClick={() => logout()}
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-destructive transition-colors group w-full"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  )
}
