"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Heart,
  PackageSearch,
  RefreshCw,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useFollowedShops, useUnfollowShop } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { SafeImage } from "@/components/ui/safe-image";

function FollowedShopsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
        >
          <div className="aspect-[16/9] animate-pulse bg-border/20" />
          <div className="space-y-4 p-5">
            <div className="h-3 w-28 animate-pulse rounded bg-border/30" />
            <div className="h-6 w-4/5 animate-pulse rounded bg-border/30" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-border/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfileFollowingShopsPage() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const isCustomer = isAuthenticated && user?.roles?.includes("ROLE_CUSTOMER");
  const {
    data: follows = [],
    isLoading,
    isError,
    refetch,
  } = useFollowedShops(isCustomer);
  const unfollowShop = useUnfollowShop();

  const handleUnfollow = async (sellerId: string) => {
    try {
      await unfollowShop.mutateAsync(sellerId);
      toast.success("Đã bỏ theo dõi gian hàng.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể bỏ theo dõi gian hàng.",
      );
    }
  };

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card p-12 text-center text-card-foreground shadow-sm">
        <Store className="mx-auto mb-5 h-14 w-14 text-primary/30" />
        <h1 className="font-serif text-3xl font-bold text-primary">
          Đăng nhập để xem gian hàng đang theo dõi
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Theo dõi studio yêu thích để quay lại nhanh các bộ sưu tập handmade
          phù hợp với gu của bạn.
        </p>
        <Link
          href="/login?redirect=/profile/following-shops"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (!isAuthLoading && isAuthenticated && !user?.roles?.includes("ROLE_CUSTOMER")) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card p-12 text-center text-card-foreground shadow-sm">
        <Store className="mx-auto mb-5 h-14 w-14 text-muted-foreground/30" />
        <h1 className="font-serif text-3xl font-bold text-primary">
          Tính năng dành riêng cho Khách hàng
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Chỉ các tài khoản Khách hàng mới có thể theo dõi các nghệ nhân và xem danh sách các gian hàng yêu thích ở đây.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Trở về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.28em] text-secondary-foreground">
          Studio yêu thích
        </span>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-4xl font-bold text-primary">
              Gian hàng đang theo dõi
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Lưu lại những studio thủ công bạn muốn quay lại để xem sản phẩm
              mới, đặt custom hoặc nhắn tin sau.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full border border-primary/15 bg-primary/5 px-5 py-3 text-primary">
            <Heart className="h-5 w-5" fill="currentColor" />
            <span className="font-serif text-2xl font-bold leading-none">
              {follows.length}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              gian hàng
            </span>
          </div>
        </div>
      </div>

      {isAuthLoading || isLoading ? (
        <FollowedShopsSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-card p-12 text-center text-card-foreground shadow-sm">
          <AlertCircle className="mx-auto mb-5 h-14 w-14 text-destructive/60" />
          <h2 className="font-serif text-3xl font-bold text-primary">
            Không thể tải danh sách gian hàng
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Kết nối hoặc phiên đăng nhập có thể đã hết hạn. Vui lòng thử tải lại
            danh sách.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-md border border-primary/20 bg-background px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary/5"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        </div>
      ) : follows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card p-12 text-center text-card-foreground shadow-sm">
          <PackageSearch className="mx-auto mb-5 h-16 w-16 text-muted-foreground/25" />
          <h2 className="font-serif text-3xl font-bold text-primary">
            Chưa theo dõi gian hàng nào
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Mở trang gian hàng và bấm Theo dõi Studio để lưu lại những nghệ
            nhân bạn quan tâm.
          </p>
          <Link
            href="/sellers"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Khám phá gian hàng
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {follows.map((follow) => {
            const seller = follow.seller;
            const studioName = seller.shopName || seller.name;
            const imageUrl = seller.sellerHeroImage || seller.avatar || "";

            return (
              <article
                key={follow.id}
                className="group overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-[0_15px_30px_-18px_rgba(84,67,60,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_42px_-24px_rgba(84,67,60,0.24)]"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-accent">
                  {imageUrl ? (
                    <SafeImage
                      src={mediaApi.getImageUrl(imageUrl)}
                      alt={studioName}
                      fill
                      sizes="(max-width: 768px) 100vw, 520px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-foreground">
                      Chưa có ảnh gian hàng
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
                      {seller.sellerTitle || "Studio thủ công"}
                    </p>
                    <Link
                      href={`/sellers/${seller.id}`}
                      className="mt-2 block font-serif text-2xl font-bold leading-snug text-primary transition-colors hover:text-primary/70"
                    >
                      {studioName}
                    </Link>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {seller.sellerBio ||
                        "Gian hàng đang cập nhật thêm câu chuyện và bộ sưu tập của mình."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 pt-4">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      <Heart className="h-4 w-4 text-primary" />
                      {seller.followerCount.toLocaleString("vi-VN")} theo dõi
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUnfollow(seller.id)}
                        disabled={
                          unfollowShop.isPending &&
                          unfollowShop.variables === seller.id
                        }
                        className="inline-flex h-10 items-center justify-center rounded-md border border-border/60 bg-background px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Bỏ theo dõi
                      </button>
                      <Link
                        href={`/sellers/${seller.id}`}
                        aria-label="Xem gian hàng"
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
