"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await register({ name, email, password, phone });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background lg:h-screen lg:overflow-hidden">
      <CustomerNavBar />

      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-accent/30 p-16 pt-28 lg:flex xl:p-24 xl:pt-32">
        <div className="animate-pulse absolute -left-[10%] top-[-10%] h-[70%] w-[70%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -right-[5%] bottom-[5%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[100px]" />

        <Link
          href="/"
          className="relative z-10 text-2xl font-serif font-bold uppercase tracking-widest text-primary"
        >
          HandCraft Market
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="mb-8 text-[2rem] font-serif font-bold leading-[1.1] text-foreground">
            Mở một gian hàng
            <br />
            thủ công đáng nhớ.
          </h2>
          <p className="font-serif text-lg italic leading-relaxed text-muted-foreground opacity-90">
            Tạo tài khoản để lưu bộ sưu tập, trò chuyện với người bán và bắt
            đầu hành trình đưa sản phẩm thủ công đến đúng người yêu chúng.
          </p>
        </div>

        <div className="relative z-10 flex items-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
          <div className="mr-4 h-px w-10 bg-primary/20" />
          Marketplace thủ công
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-start overflow-y-auto bg-background px-8 pb-8 pt-24 sm:px-16 sm:pb-16 sm:pt-28 lg:w-[55%]">
        <div className="animate-in slide-in-from-right-4 fade-in duration-700 w-full max-w-[420px] py-8 lg:py-10">
          {success ? (
            <div className="flex min-h-[70vh] flex-col justify-center">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="mb-10">
                <h1 className="mb-3 text-4xl font-serif font-bold text-foreground">
                  Kiểm tra email của bạn
                </h1>
                <p className="font-serif text-lg italic leading-relaxed text-muted-foreground">
                  Chúng tôi đã gửi mã xác thực tới email bên dưới để hoàn tất
                  tạo tài khoản.
                </p>
              </div>

              <div className="mb-8 rounded-lg border border-primary/10 bg-primary/5 px-4 py-3 font-serif text-sm font-semibold text-foreground">
                {email}
              </div>

              <Link
                href={`/verify-otp?email=${encodeURIComponent(email)}`}
                className="btn-artisanal group flex w-full items-center justify-center rounded py-4 text-lg font-serif font-bold"
              >
                Xác thực Email
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <div className="mt-12 text-center font-serif text-lg italic text-muted-foreground">
                Đã xác thực?{" "}
                <Link
                  href="/login"
                  className="font-bold text-primary underline-offset-4 decoration-primary/30 hover:underline"
                >
                  Đăng nhập
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-12">
                <h1 className="mb-3 text-4xl font-serif font-bold text-foreground">
                  Tạo tài khoản mới
                </h1>
                <p className="font-serif text-lg italic leading-relaxed text-muted-foreground">
                  Bắt đầu hành trình sưu tầm, mua bán và kể câu chuyện phía sau
                  từng món đồ thủ công.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="mb-1 block text-lg font-serif text-foreground"
                  >
                    Họ và tên
                  </Label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Nguyễn Minh An"
                    className="input-minimal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="mb-1 block text-lg font-serif text-foreground"
                  >
                    Địa chỉ Email
                  </Label>
                  <input
                    id="email"
                    type="email"
                    placeholder="nghenhan@handcraft.studio"
                    className="input-minimal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="mb-1 block text-lg font-serif text-foreground"
                  >
                    Số điện thoại
                  </Label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+84 ..."
                    className="input-minimal"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="mb-1 block text-lg font-serif text-foreground"
                  >
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 6 ký tự"
                      className="input-minimal pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="animate-in shake-in-1 duration-300 flex items-center gap-3 rounded-lg border border-destructive/10 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium font-serif italic">
                      {error}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-artisanal group mt-2 flex w-full items-center justify-center rounded py-4 text-lg font-serif font-bold"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Đăng ký
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-12 text-center font-serif text-lg italic text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="font-bold text-primary underline-offset-4 decoration-primary/30 hover:underline"
                >
                  Đăng nhập
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
