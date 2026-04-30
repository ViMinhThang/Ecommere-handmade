"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

let isGoogleIdentityInitialized = false;
let initializedGoogleClientId: string | null = null;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { login, loginWithGoogle } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/";
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const initializeGoogleSignIn = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const googleApi = window.google?.accounts?.id;

    if (!clientId) {
      setGoogleUnavailable(true);
      setIsGoogleReady(false);
      return;
    }
    if (!googleApi || !googleButtonRef.current) {
      setIsGoogleReady(false);
      return;
    }

    setGoogleUnavailable(false);
    googleButtonRef.current.innerHTML = "";
    if (
      !isGoogleIdentityInitialized ||
      initializedGoogleClientId !== clientId
    ) {
      googleApi.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const credential = response.credential;
            if (!credential) {
              throw new Error("Không nhận được token từ Google");
            }

            setIsGoogleLoading(true);
            setError("");
            await loginWithGoogle(credential);
            router.push(redirectTo);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Đăng nhập Google thất bại",
            );
          } finally {
            setIsGoogleLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      isGoogleIdentityInitialized = true;
      initializedGoogleClientId = clientId;
    }

    const buttonWidth = Math.max(
      220,
      Math.min(380, googleButtonRef.current.clientWidth || 380),
    );

    googleApi.renderButton(googleButtonRef.current, {
      type: "standard",
      theme: theme === "dark" ? "filled_black" : "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: buttonWidth,
    });

    setIsGoogleReady(true);
  }, [loginWithGoogle, redirectTo, router, theme]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setIsGoogleScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isGoogleScriptLoaded) {
      return;
    }

    initializeGoogleSignIn();

    return () => {
      window.google?.accounts?.id.cancel();
    };
  }, [initializeGoogleSignIn, isGoogleScriptLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background lg:h-screen lg:overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="fixed right-6 top-6 z-50 rounded-full hover:bg-primary/10"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-primary" />
        ) : (
          <Moon className="h-5 w-5 text-primary" />
        )}
        <span className="sr-only">Chuyển đổi giao diện</span>
      </Button>

      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-accent/30 p-16 lg:flex xl:p-24">
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
            Trở về với những
            <br />
            đôi bàn tay tạo tác.
          </h2>
          <p className="font-serif text-lg italic leading-relaxed text-muted-foreground opacity-90">
            Một không gian thương mại tinh tuyển dành cho người bán bậc thầy và
            những vị khách trân trọng giá trị thủ công.
          </p>
        </div>

        <div className="relative z-10 flex items-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
          <div className="mr-4 h-px w-10 bg-primary/20" />
          Thành lập 2024
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-start overflow-y-auto bg-background p-8 sm:p-16 lg:w-[55%]">
        <div className="animate-in slide-in-from-right-4 fade-in duration-700 w-full max-w-[420px] py-8 lg:py-10">
          <div className="mb-12">
            <h1 className="mb-3 text-4xl font-serif font-bold text-foreground">
              Chào mừng quay lại
            </h1>
            <p className="font-serif text-lg italic text-muted-foreground">
              Vui lòng nhập thông tin để truy cập vào không gian của bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="mb-1 block text-lg font-serif text-foreground"
              >
                Địa chỉ Email
              </Label>
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

            <div className="space-y-2">
              <div className="mb-1 flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="block text-lg font-serif text-foreground"
                >
                  Mật khẩu
                </Label>
                <Link
                  href="/forgot-password"
                  className="font-serif text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="********"
                  className="input-minimal pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                </button>
              </div>
            </div>

            {error && (
              <div className="animate-in shake-in-1 duration-300 flex items-center gap-3 rounded-lg border border-destructive/10 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium font-serif italic">{error}</span>
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
                  Đăng nhập
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center">
            <div className="flex-grow border-t border-border/60" />
            <span className="px-6 font-serif text-sm text-muted-foreground">
              HOẶC
            </span>
            <div className="flex-grow border-t border-border/60" />
          </div>

          <div className="space-y-3">
            <div
              ref={googleButtonRef}
              className="flex w-full justify-center overflow-hidden rounded"
            />
            {!isGoogleReady && (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center rounded bg-accent/50 py-3.5 text-lg font-serif font-bold text-primary opacity-70"
              >
                {googleUnavailable ? (
                  "Google Sign-In chưa được cấu hình"
                ) : isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang xử lý với Google
                  </>
                ) : (
                  "Đang tải Google Sign-In..."
                )}
              </button>
            )}
          </div>

          <div className="group mt-10 space-y-4 rounded-xl border border-primary/10 bg-primary/5 p-6 shadow-sm transition-colors duration-300 hover:bg-primary/10">
            <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              <AlertCircle className="h-3.5 w-3.5" />
              Tài khoản dùng thử
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email
                </p>
                <p className="font-serif font-semibold tracking-tight text-foreground">
                  admin@ecommerce.com
                </p>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Mật khẩu
                </p>
                <p className="font-serif font-semibold tracking-tight text-foreground">
                  admin123
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full border border-primary/20 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 hover:bg-primary hover:text-white"
              onClick={() => {
                setEmail("admin@ecommerce.com");
                setPassword("admin123");
              }}
            >
              Tự động điền thông tin
            </Button>
          </div>

          <div className="mt-12 text-center font-serif text-lg italic text-muted-foreground">
            Bạn chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-bold text-primary underline-offset-4 decoration-primary/30 hover:underline"
            >
              Đăng ký người bán
            </Link>
          </div>
        </div>
      </div>

      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsGoogleScriptLoaded(true)}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}