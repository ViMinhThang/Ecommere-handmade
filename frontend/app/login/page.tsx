"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { AlertCircle, Loader2, Moon, Sun, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login({ email, password })
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-6 right-6 z-50 rounded-full hover:bg-primary/10"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
        <span className="sr-only">Chuyển đổi giao diện</span>
      </Button>

      {/* Left Panel: Branding & Imagery Area */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-accent/30 p-16 xl:p-24 relative overflow-hidden">
        {/* Subtle decorative background element */}
        <div className="absolute top-[-10%] -left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[5%] -right-[5%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px]"></div>

        {/* Logo */}
        <Link href="/" className="text-2xl font-serif font-bold text-primary tracking-widest relative z-10 uppercase">
          HandCraft Market
        </Link>

        {/* Central Copy */}
        <div className="max-w-md relative z-10">
          <h2 className="text-[2rem] leading-[1.1] font-serif font-bold text-foreground mb-8">
            Trở về với những<br />
            đôi bàn tay tạo tác.
          </h2>
          <p className="text-muted-foreground font-serif text-lg leading-relaxed italic opacity-90">
            Một không gian thương mại tinh tuyển dành cho những Người bán bậc thầy và những quý khách trân trọng sự chuyên nghiệp trong từng sản phẩm.
          </p>
        </div>

        {/* Footer / Est */}
        <div className="flex items-center text-[10px] font-sans text-muted-foreground/60 uppercase tracking-[0.3em] relative z-10 font-bold">
          <div className="w-10 h-px bg-primary/20 mr-4"></div>
          Thành lập 2024
        </div>
      </div>

      {/* Right Panel: Form Area */}
      <div className="w-full lg:w-[55%] flex flex-col items-center justify-center p-8 sm:p-16 relative bg-background">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-right-4 duration-700">
          
          {/* Form Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Chào mừng Quay lại</h1>
            <p className="text-muted-foreground font-serif text-lg italic">Vui lòng nhập thông tin để truy cập vào không gian sáng tạo của quý khách.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="block font-serif text-foreground text-lg mb-1">Địa chỉ Email</Label>
              <input 
                type="email" 
                id="email" 
                placeholder="nghenhan@handcraft.studio" 
                className="input-minimal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="password" className="block font-serif text-foreground text-lg">Mật khẩu</Label>
                <Link href="/forgot-password" size="sm" className="text-muted-foreground font-serif text-sm hover:text-primary transition-colors underline-offset-4 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  placeholder="••••••••" 
                  className="input-minimal pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-2"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/5 border border-destructive/10 px-4 py-3 rounded-lg animate-in shake-in-1 duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium font-serif italic">{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full btn-artisanal font-serif font-bold text-lg py-4 rounded flex justify-center items-center group mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-grow border-t border-border/60"></div>
            <span className="px-6 text-muted-foreground font-serif text-sm">HOẶC</span>
            <div className="flex-grow border-t border-border/60"></div>
          </div>

          {/* Google Auth Button */}
          <button type="button" className="w-full bg-accent/50 text-primary font-serif font-bold text-lg py-3.5 rounded flex justify-center items-center hover:bg-accent transition-colors duration-300">
            <div className="w-4 h-4 bg-primary/20 mr-3 rounded-sm"></div>
            Tiếp tục với Google
          </button>

          {/* Trial Credentials Info */}
          <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/10 space-y-4 shadow-sm group hover:bg-primary/10 transition-colors duration-300">
            <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              <AlertCircle className="h-3.5 w-3.5" />
              Thông tin tài khoản dùng thử
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-bold mb-1">Email</p>
                <p className="font-serif font-semibold text-foreground tracking-tight">admin@ecommerce.com</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] uppercase tracking-wider font-bold mb-1">Mật khẩu</p>
                <p className="font-serif font-semibold text-foreground tracking-tight">admin123</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-9 text-[10px] uppercase font-bold tracking-widest border border-primary/20 hover:bg-primary hover:text-white transition-all duration-300"
              onClick={() => {
                setEmail("admin@ecommerce.com")
                setPassword("admin123")
              }}
            >
              Tự động điền thông tin
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-12 text-center text-muted-foreground font-serif text-lg italic">
            Quý khách chưa có tài khoản?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline underline-offset-4 decoration-primary/30">
              Đăng ký Người bán
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
