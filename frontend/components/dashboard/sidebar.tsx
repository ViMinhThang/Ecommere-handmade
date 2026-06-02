"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  ClipboardList,
  FileText,
  FilePlus2,
  Folder,
  Flag,
  Gift,
  Home,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Package,
  PenTool,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Wallet,
  Ticket,
  Users,
  Zap,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.roles?.includes("ROLE_ADMIN");
  const isSeller = user?.roles?.includes("ROLE_SELLER");
  const showAdvancedPaymentConsole = false;

  const navItems = [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, show: true },
    {
      href: "/dashboard/new-listing",
      label: "Đăng sản phẩm",
      icon: FilePlus2,
      show: isAdmin || isSeller,
    },
    {
      href: "/dashboard/products",
      label: "Sản phẩm",
      icon: Package,
      show: isAdmin || isSeller,
    },
    {
      href: "/dashboard/chat",
      label: "Tin nhắn",
      icon: MessageCircle,
      show: isAdmin || isSeller,
    },
    {
      href: "/dashboard/orders",
      label: "Đơn hàng",
      icon: ShoppingCart,
      show: isAdmin || isSeller,
    },
    {
      href: "/dashboard/payments",
      label: "Đối soát thanh toán",
      icon: Wallet,
      show: isAdmin && showAdvancedPaymentConsole,
    },
    { href: "/dashboard/users", label: "Người dùng", icon: Users, show: isAdmin },
    { href: "/dashboard/reports", label: "Báo cáo", icon: Flag, show: isAdmin },
    { href: "/dashboard/homepage", label: "Trang chủ", icon: Home, show: isAdmin },
    { href: "/dashboard/categories", label: "Danh mục", icon: Folder, show: isAdmin },
    { href: "/dashboard/vouchers", label: "Mã giảm giá", icon: Ticket, show: isAdmin },
    { href: "/dashboard/flash-sales", label: "Flash sale", icon: Zap, show: isAdmin },
    {
      href: "/dashboard/gift-wrap-tiers",
      label: "Gói quà",
      icon: Gift,
      show: isAdmin,
    },
    {
      href: "/dashboard/shipping-profiles",
      label: "Vận chuyển",
      icon: Truck,
      show: isSeller,
    },
    {
      href: "/dashboard/inventory",
      label: "Kho hàng",
      icon: ClipboardList,
      show: isSeller,
    },
    {
      href: "/seller/marketing",
      label: "Marketing",
      icon: Megaphone,
      show: isSeller,
    },
    {
      href: "/seller/commissions",
      label: "Yêu cầu thiết kế",
      icon: ClipboardList,
      show: isSeller,
    },
    {
      href: "/seller/custom-orders",
      label: "Thiết kế riêng",
      icon: PenTool,
      show: isSeller,
    },
    {
      href: "/seller/quote-templates",
      label: "Mẫu báo giá",
      icon: FileText,
      show: isSeller,
    },
    { href: "/dashboard/media", label: "Thư viện ảnh", icon: Image, show: true },
    { href: "/dashboard/settings", label: "Cài đặt", icon: Settings, show: true },
  ].filter((item) => item.show);

  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-[17rem] min-h-screen border-r border-sidebar-border/80 bg-sidebar flex flex-col shadow-[20px_0_35px_-30px_rgba(84,67,60,0.35)]">
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-serif text-xl italic text-primary leading-none">
              Terra &amp; Thread
            </h1>
            <p className="text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/65 mt-1">
              Khu vận hành
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((navItem) => {
          const isActive = isNavItemActive(navItem.href);
          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary shadow-[0_10px_20px_-16px_rgba(84,67,60,0.5)] dark:bg-sidebar-primary/14 dark:text-sidebar-primary dark:shadow-none"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground dark:hover:bg-sidebar-accent/70",
              )}
            >
              <navItem.icon className="h-4 w-4 shrink-0" />
              {navItem.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/70 p-4 space-y-1.5">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
