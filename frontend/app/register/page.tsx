"use client"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { AlertCircle, CheckCircle2, Loader2, Moon, Store, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

export default function RegisterPage() {
  const { theme, setTheme } = useTheme()
  const { register } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await register({ name, email, password, phone })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="sr-only">Toggle theme</span>
      </Button>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              {success ? <CheckCircle2 className="h-5 w-5" /> : <Store className="h-5 w-5" />}
            </div>
            <CardTitle className="text-[1.8rem]">
              {success ? "Đăng ký Hoàn tất" : "Tạo Tài khoản mới"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Kiểm tra hộp thư và xác thực tài khoản để tiếp tục."
                : "Bắt đầu hành trình sưu tầm và chế tác sản phẩm thủ công."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {success ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Chúng tôi đã gửi mã xác thực tới <span className="font-semibold text-foreground">{email}</span>.
                </p>
                <Link href={`/verify-otp?email=${encodeURIComponent(email)}`}>
                  <Button className="w-full">Xác thực Email</Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Đã xác thực?{" "}
                  <Link href="/login" className="text-primary hover:underline font-semibold">
                    Đăng nhập
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và Tên</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nhập tên của bạn"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại (tùy chọn)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+84 ..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-md">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Đăng ký
                  </Button>
                </form>

                <div className="mt-5 border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
                  Đã có tài khoản?{" "}
                  <Link href="/login" className="text-primary hover:underline font-semibold">
                    Đăng nhập
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
