"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { useCategories } from "@/lib/api/hooks";
import { usePathname } from "next/navigation";

export function CustomerNavBar() {
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCartContext();
  const { data: categoriesData } = useCategories({ status: "ACTIVE" });
  const categories = categoriesData?.data || [];
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const displayedCategories = mounted ? categories.slice(0, 4) : [];
  const profileHref = mounted && isAuthenticated ? "/profile/settings" : "/login";
  const displayedItemCount = mounted ? itemCount : 0;

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/85 backdrop-blur-xl shadow-[0_40px_40px_rgba(84,67,60,0.06)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-2xl font-headline italic text-primary">
            The Artisanal Curator
          </Link>
          <div className="hidden md:flex gap-8 items-center">
            <Link
              href="/discovery"
              className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                pathname === "/discovery"
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Discover
            </Link>
            <Link
              href="/sellers"
              className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                pathname === "/sellers"
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Gian hàng
            </Link>
            {displayedCategories.map((category) => {
              const categoryPath = `/categories/${category.slug || category.id}`;
              const isActive = pathname === categoryPath;
              return (
                <Link
                  key={category.id}
                  href={categoryPath}
                  className={`font-medium transition-colors duration-300 font-headline italic tracking-tight ${
                    isActive
                      ? "text-primary border-b-2 border-primary pb-1"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            href="/cart" 
            className="relative text-muted-foreground hover:text-primary scale-95 duration-200 ease-out flex items-center justify-center"
          >
            <ShoppingBag className="w-5 h-5" />
            {displayedItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center leading-none">
                {displayedItemCount > 99 ? "99+" : displayedItemCount}
              </span>
            )}
          </Link>
          <Link 
            href={profileHref}
            className="text-muted-foreground hover:text-primary scale-95 duration-200 ease-out flex items-center justify-center"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

