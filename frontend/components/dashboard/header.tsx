"use client"

import { useRouter } from "next/navigation"
import { Bell, LogOut, Moon, Search, Sun, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"

export function Header() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm bộ sưu tập, sản phẩm, đơn hàng..."
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="ml-2 pl-3 border-l border-border/60 flex items-center gap-2.5">
          <Avatar className="h-8 w-8 ring-1 ring-border/50">
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>

          <div className="hidden md:flex flex-col">
            <span className="text-sm font-semibold leading-none">{user?.name || "Người dùng"}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
