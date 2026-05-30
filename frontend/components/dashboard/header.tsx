"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Home, LogOut, Moon, Search, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { mediaApi } from "@/lib/api/media"
import { NotificationBell } from "@/components/notifications/notification-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()

  const [open, setOpen] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setOpen(true)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setOpen(false)
    }, 150)
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const roleLabel = user?.roles?.includes("ROLE_ADMIN")
    ? "Quản trị viên"
    : user?.roles?.includes("ROLE_SELLER")
      ? "Người bán"
      : "Khách hàng"

  return (
    <header className="h-[4.4rem] border-b border-border/70 bg-background/85 backdrop-blur-xl flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-[24rem]">
          <label htmlFor="dashboard-search" className="sr-only">
            Tìm kiếm trong dashboard
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="dashboard-search"
            type="search"
            name="dashboard-search"
            aria-label="Tìm kiếm trong dashboard"
            placeholder="Tìm kiếm bộ sưu tập, sản phẩm, đơn hàng..."
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationBell />

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="ml-2 pl-3 border-l border-border/60 flex items-center gap-2.5 focus:outline-none hover:opacity-85 transition-opacity text-left cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            }
          >
            <Avatar className="h-8 w-8 ring-1 ring-border/50">
              <AvatarImage src={user?.avatar ? mediaApi.getImageUrl(user.avatar) : ""} />
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div className="hidden md:flex flex-col">
              <span className="text-sm font-semibold leading-none">{user?.name || "Người dùng"}</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 rounded-none border border-border/60 bg-background/95 p-3 shadow-[0_30px_60px_rgba(84,67,60,0.12)] backdrop-blur-xl"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="border-b border-border/50 px-3 pb-3 pt-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.name || "Người dùng"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1">
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false)
                  router.push("/")
                }}
                className="flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <Home className="h-4 w-4 shrink-0 text-muted-foreground group-hover/dropdown-menu-item:text-primary" />
                <span className="truncate">Về trang chủ</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false)
                  void handleLogout()
                }}
                variant="destructive"
                className="flex items-center gap-3 rounded-none px-3 py-2.5 text-[0.875rem] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">Đăng xuất</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-2.5 pl-3 border-l border-border/60">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
