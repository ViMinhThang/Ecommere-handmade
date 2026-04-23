"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { AlertCircle, CheckCircle2, Loader2, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { authApi } from "@/lib/api/auth"

function VerifyOtpContent() {
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [otpCode, setOtpCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await authApi.verifyOtp({ email, otpCode })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác nhận thất bại")
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
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-[1.75rem]">
              {success ? "Email đã được Xác thực" : "Xác thực Email của Bạn"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Tài khoản của bạn đã được kích hoạt và sẵn sàng để sử dụng."
                : "Nhập mã xác thực 6 chữ số chúng tôi đã gửi tới email của bạn."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {success ? (
              <Link href="/login">
                <Button className="w-full">Đi tới Đăng nhập</Button>
              </Link>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@atelier.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp">Mã Xác nhận</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center tracking-[0.2em] font-semibold"
                      maxLength={6}
                      required
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
                    Xác nhận
                  </Button>
                </form>

                <div className="mt-5 border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
                  Không nhận được mã?{" "}
                  <Link href="/register" className="text-primary hover:underline font-semibold">
                    Đăng ký lại
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

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  )
}
