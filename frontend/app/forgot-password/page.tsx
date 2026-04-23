"use client"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { authApi } from "@/lib/api/auth"

export default function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await authApi.forgotPassword({ email })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yêu cầu thất bại")
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
          <CardHeader className="text-center space-y-3 pb-4 relative">
            <Link href="/login" className="absolute left-0 top-0">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-[1.75rem]">Quên Mật khẩu</CardTitle>
            <CardDescription>
              Nhập email của bạn và chúng tôi sẽ gửi mã đặt lại mật khẩu.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {success ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Mã đặt lại đã được gửi đến <span className="font-semibold text-foreground">{email}</span>.
                </p>
                <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
                  <Button className="w-full">Tiếp tục Đặt lại</Button>
                </Link>
              </div>
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

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-md">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gửi Mã Đặt lại
                  </Button>
                </form>

                <div className="mt-5 border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
                  Đã nhớ mật khẩu?{" "}
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
