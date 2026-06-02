"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronDown, Moon, ShoppingBag, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useCategories } from "@/lib/api/hooks";

export function CustomerNavBar() {
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCartContext();
  const { theme, setTheme } = useTheme();
  const { data: categoriesData } = useCategories({ status: "ACTIVE" });
  const categories = categoriesData?.data || [];
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const headerCategories = mounted ? categories : [];

  // const featuredCategories = headerCategories.slice(0, 4);
  const profileHref = mounted && isAuthenticated ? "/profile/settings" : "/login";
  const displayedItemCount = mounted ? itemCount : 0;
  const isDarkMode = mounted && theme === "dark";

  return (
    <nav className="fixed top-0 z-50 w-full bg-background/85 shadow-[0_40px_40px_rgba(84,67,60,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-full items-center justify-between px-8 py-4">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-2xl font-headline italic text-primary">
            The Artisanal Curator
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/discovery"
              className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                pathname === "/discovery"
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Khám phá
            </Link>
            <Link
              href="/products"
              className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                pathname === "/products" || pathname.startsWith("/products/")
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Sản phẩm
            </Link>
            <Link
              href="/sellers"
              className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                pathname === "/sellers"
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Gian hàng
            </Link>
            <Link
              href="/commissions"
              className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                pathname === "/commissions" || pathname.startsWith("/commissions/")
                  ? "border-b-2 border-primary pb-1 text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Commission
            </Link>

            <div className="relative group">
              <Link
                href="/categories"
                className={`flex items-center gap-2 font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                  pathname === "/categories" || pathname.startsWith("/categories/")
                    ? "border-b-2 border-primary pb-1 text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
                aria-haspopup="menu"
                aria-label="Danh mục sản phẩm"
              >
                Danh mục
                <ChevronDown className="h-4 w-4 opacity-70 transition-transform duration-200 group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute left-0 top-full z-50 mt-3 max-h-[70vh] w-80 overflow-y-auto rounded-none border border-border/60 bg-background/95 p-3 shadow-[0_30px_60px_rgba(84,67,60,0.12)] backdrop-blur-xl opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-1 gap-1">
                  {headerCategories.map((category) => {
                    const categoryPath = `/categories/${category.slug || category.id}`;
                    const isActive = pathname === categoryPath;
                    return (
                      <Link
                        key={category.id}
                        href={categoryPath}
                        className={`rounded-none px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                        role="menuitem"
                      >
                        {category.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Featured categories in heading (commented out to hide)
            {featuredCategories.map((category) => {
              const categoryPath = `/categories/${category.slug || category.id}`;
              const isActive = pathname === categoryPath;
              return (
                <Link
                  key={category.id}
                  href={categoryPath}
                  className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                    isActive
                      ? "border-b-2 border-primary pb-1 text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
            */}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <NotificationBell />
          <Link
            href="/cart"
            className="relative flex items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-primary"
            aria-label="Giỏ hàng"
          >
            <ShoppingBag className="h-5 w-5" />
            {displayedItemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                {displayedItemCount > 99 ? "99+" : displayedItemCount}
              </span>
            )}
          </Link>
          <Link
            href={profileHref}
            className="flex items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-primary"
            aria-label={mounted && isAuthenticated ? "Tài khoản" : "Đăng nhập"}
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            aria-label="Chuyển đổi giao diện"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

