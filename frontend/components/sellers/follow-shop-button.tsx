"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useFollowShop,
  useShopFollowStatus,
  useUnfollowShop,
} from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

interface FollowShopButtonProps {
  sellerId: string;
  initialFollowerCount?: number;
  redirectPath?: string;
  className?: string;
}

export function FollowShopButton({
  sellerId,
  initialFollowerCount = 0,
  redirectPath,
  className,
}: FollowShopButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isOwner = user?.id === sellerId;
  const canUseFollow = Boolean(user?.roles?.includes("ROLE_USER"));
  const statusQuery = useShopFollowStatus(
    sellerId,
    isAuthenticated && !isOwner && canUseFollow,
  );
  const followMutation = useFollowShop();
  const unfollowMutation = useUnfollowShop();
  const isMutating = followMutation.isPending || unfollowMutation.isPending;
  const status = statusQuery.data;
  const isFollowing = Boolean(status?.isFollowing);
  const followerCount = status?.followerCount ?? initialFollowerCount;

  const loginTarget = useMemo(() => {
    const target = redirectPath || `/sellers/${sellerId}`;
    return `/login?redirect=${encodeURIComponent(target)}`;
  }, [redirectPath, sellerId]);

  const handleToggleFollow = async () => {
    if (isAuthLoading || isOwner) {
      return;
    }

    if (!isAuthenticated) {
      router.push(loginTarget);
      return;
    }

    if (!canUseFollow) {
      toast.error("Chỉ tài khoản khách hàng mới có thể theo dõi gian hàng.");
      return;
    }

    try {
      if (isFollowing) {
        await unfollowMutation.mutateAsync(sellerId);
        toast.success("Đã bỏ theo dõi gian hàng.");
      } else {
        await followMutation.mutateAsync(sellerId);
        toast.success("Đã theo dõi gian hàng.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái theo dõi.",
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={isAuthLoading || isMutating || isOwner}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
        isFollowing && "bg-[#ebe8e2] text-primary hover:bg-[#e6e2dc]",
        className,
      )}
      aria-pressed={isFollowing}
    >
      {isMutating ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Heart
          className="h-4 w-4"
          fill={isFollowing ? "currentColor" : "none"}
        />
      )}
      <span>
        {isOwner
          ? "Gian hàng của bạn"
          : isFollowing
            ? "Đang theo dõi"
            : "Theo dõi Studio"}
      </span>
      <span className="text-xs font-semibold opacity-80">
        {followerCount.toLocaleString("vi-VN")}
      </span>
    </button>
  );
}
