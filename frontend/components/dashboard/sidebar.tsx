"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  ClipboardList,
  FilePlus2,
  Folder,
  Image,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  PenTool,
  Settings,
  ShoppingCart,
  Store,
  Ticket,
  Users,
  Zap,
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  const isSeller = user?.roles?.includes("ROLE_SELLER")

  const navItems = [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, show: true },
    { href: "/dashboard/new-listing", label: "Đăng sản phẩm", icon: FilePlus2, show: isAdmin || isSeller },
    { href: "/dashboard/products", label: "Sản phẩm", icon: Package, show: isAdmin || isSeller },
    { href: "/dashboard/chat", label: "Tin nhan", icon: MessageCircle, show: isAdmin || isSeller },
    { href: "/dashboard/orders", label: "Đơn hàng", icon: ShoppingCart, show: isAdmin },
    { href: "/dashboard/users", label: "Người dùng", icon: Users, show: isAdmin },
    { href: "/dashboard/categories", label: "Danh mục", icon: Folder, show: isAdmin },
    { href: "/dashboard/vouchers", label: "Mã giảm giá", icon: Ticket, show: isAdmin },
    { href: "/dashboard/flash-sales", label: "Flash Sales", icon: Zap, show: isAdmin },
    { href: "/dashboard/inventory", label: "Kho hàng", icon: ClipboardList, show: isSeller },
    { href: "/seller/custom-orders", label: "Thiết kế riêng", icon: PenTool, show: isSeller },
    { href: "/dashboard/media", label: "Thư viện ảnh", icon: Image, show: true },
    { href: "/dashboard/settings", label: "Cài đặt", icon: Settings, show: true },
  ].filter((item) => item.show)

  return (
    <aside className="w-[17rem] min-h-screen border-r border-sidebar-border/80 bg-sidebar flex flex-col shadow-[20px_0_35px_-30px_rgba(84,67,60,0.35)]">
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-serif text-xl italic text-primary leading-none">Terra &amp; Thread</h1>
            <p className="text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/65 mt-1">
              Master Craftsperson
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((navItem) => {
          const isActive = pathname === navItem.href || pathname.startsWith(`${navItem.href}/`)
          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white text-primary shadow-[0_10px_20px_-16px_rgba(84,67,60,0.5)]"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <navItem.icon className="h-4 w-4 shrink-0" />
              {navItem.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border/70 space-y-2.5">
        <Link
          href="/dashboard/new-listing"
          className="flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-[0_14px_24px_-18px_rgba(133,55,36,0.65)] hover:brightness-[1.03] transition-all"
        >
          <FilePlus2 className="h-4 w-4" />
          Đăng sản phẩm mới
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Link>
      </div>
    </aside>
  )
}


