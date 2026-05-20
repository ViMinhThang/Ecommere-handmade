import {
  Check,
  Heart,
  MessageCircle,
  MessageSquare,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlistStatus,
} from "@/lib/api/hooks";
import { Product } from "@/lib/api/products";

interface ProductActionsProps {
  product: Product;
  quantity: number;
  setQuantity: (q: number) => void;
  onAddToCart: () => void;
  isAdding: boolean;
  addedSuccess: boolean;
  onOpenChat: (sellerId: string, productId: string) => void;
  isAuthenticated: boolean;
}

export function ProductActions({
  product,
  quantity,
  setQuantity,
  onAddToCart,
  isAdding,
  addedSuccess,
  onOpenChat,
  isAuthenticated,
}: ProductActionsProps) {
  const { data: wishlistStatus } = useWishlistStatus(
    product.id,
    isAuthenticated,
  );
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const isWishlisted = Boolean(wishlistStatus?.isWishlisted);
  const isWishlistUpdating =
    addToWishlist.isPending || removeFromWishlist.isPending;

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/products/${product.id}`;
      return;
    }

    try {
      if (isWishlisted) {
        await removeFromWishlist.mutateAsync(product.id);
        toast.success("Đã bỏ sản phẩm khỏi danh sách yêu thích.");
        return;
      }

      await addToWishlist.mutateAsync(product.id);
      toast.success("Đã thêm sản phẩm vào danh sách yêu thích.");
    } catch {
      toast.error("Không thể cập nhật danh sách yêu thích lúc này.");
    }
  };

  const handleCustomRequestClick = () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để nhắn tin.");
      window.setTimeout(() => {
        window.location.href = `/login?redirect=/products/${product.id}`;
      }, 600);
      return;
    }

    onOpenChat(product.sellerId, product.id);
  };

  return (
    <div className="flex flex-col gap-4">
      {product.stock > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Số lượng:
          </span>
          <div className="flex items-center gap-4 rounded-full bg-accent px-4 py-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="text-foreground transition-opacity disabled:opacity-30"
              aria-label="Giảm số lượng"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-sans font-semibold tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              disabled={quantity >= product.stock}
              className="text-foreground transition-opacity disabled:opacity-30"
              aria-label="Tăng số lượng"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-3">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={product.stock <= 0 || isAdding}
          className={`flex w-full items-center justify-center gap-3 rounded-md py-5 font-bold tracking-wide shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            addedSuccess
              ? "bg-secondary text-secondary-foreground"
              : product.stock > 0
                ? "bg-linear-to-br from-primary to-[#a44e39] text-primary-foreground hover:shadow-primary/20 active:scale-[0.98]"
                : "cursor-not-allowed bg-muted text-muted-foreground"
          }`}
        >
          {addedSuccess ? (
            <>
              <Check className="h-5 w-5" /> Đã thêm vào giỏ hàng
            </>
          ) : isAdding ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : product.stock > 0 ? (
            <>
              <ShoppingBag className="h-5 w-5" /> Thêm vào giỏ hàng
            </>
          ) : (
            "Hết hàng"
          )}
        </button>

        <button
          type="button"
          aria-pressed={isWishlisted}
          aria-label={
            isWishlisted
              ? "Bỏ khỏi danh sách yêu thích"
              : "Thêm vào danh sách yêu thích"
          }
          onClick={handleWishlistToggle}
          disabled={isWishlistUpdating}
          className={`flex min-h-16 w-16 items-center justify-center rounded-md border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 ${
            isWishlisted
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-primary/30 bg-card text-primary hover:bg-primary/5"
          }`}
        >
          {isWishlistUpdating ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Heart
              className="h-5 w-5"
              fill={isWishlisted ? "currentColor" : "none"}
            />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={handleCustomRequestClick}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 py-5 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
      >
        <MessageSquare className="h-4 w-4" />
        Yêu cầu tùy chỉnh
      </button>

      <button
        type="button"
        onClick={() => onOpenChat(product.sellerId, product.id)}
        className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-xs font-semibold tracking-wide text-muted-foreground transition-colors hover:text-primary"
      >
        <MessageCircle className="h-4 w-4" />
        Hỏi về sản phẩm
      </button>
    </div>
  );
}
