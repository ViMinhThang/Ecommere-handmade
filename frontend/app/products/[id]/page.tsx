"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, History, Leaf } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { useProduct, useProductReviews } from "@/lib/api/hooks";
import { Product } from "@/lib/api/products";
import { mediaApi } from "@/lib/api/media";
import { useCartContext } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { productsApi } from "@/lib/api/products";
import { ProductInfo } from "@/features/product/components/product-info";
import { ProductActions } from "@/features/product/components/product-actions";
import { ProductStory } from "@/features/product/components/product-story";
import { ProductReviews } from "@/features/product/components/product-reviews";
import { ProductQuestionsSection } from "@/features/product/components/product-questions";
import { RelatedProducts } from "@/features/product/components/related-products";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: product, isLoading, error } = useProduct(id!);
  const { data: reviews, isLoading: isReviewsLoading } = useProductReviews(id!);

  useEffect(() => {
    if (product?.id) {
      const viewedKey = `viewed_product_${product.id}`;
      if (!sessionStorage.getItem(viewedKey)) {
        productsApi.recordView(product.id).catch(console.error);
        sessionStorage.setItem(viewedKey, "true");
      }
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground font-body">
        <CustomerNavBar />
        <main className="pt-24 min-h-screen grid place-items-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground font-headline italic">
              Đang tải dữ liệu sản phẩm...
            </p>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground font-body">
        <CustomerNavBar />
        <main className="pt-24 min-h-screen grid place-items-center">
          <div className="text-center">
            <h1 className="text-4xl font-headline italic text-primary mb-4">
              Không tìm thấy sản phẩm
            </h1>
            <p className="text-muted-foreground mb-8">
              Sản phẩm này hiện không còn trong cửa hàng của chúng tôi.
            </p>
            <Link
              href="/"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-md tracking-wide"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  const artisanImage = product.seller?.avatar
    ? mediaApi.getImageUrl(product.seller.avatar)
    : null;

  return (
    <ProductDetailContent
      product={product}
      artisanImage={artisanImage}
      reviews={reviews || []}
      isReviewsLoading={isReviewsLoading}
    />
  );
}

function ProductDetailContent({
  product,
  artisanImage,
  reviews,
  isReviewsLoading,
}: {
  product: Product;
  artisanImage: string | null;
  reviews: any[];
  isReviewsLoading: boolean;
}) {
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCartContext();
  const { openChat } = useChat();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const averageRating = useMemo(() => {
    if (!reviews?.length) return 0;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/products/${product.id}`;
      return;
    }
    setIsAdding(true);
    try {
      await addItem(product.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } catch {
      // Error handled by mutation
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-32 pb-24 min-h-screen">
        <section className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7">
            <ProductGallery
              images={product.images || []}
              productName={product.name}
            />
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-10">
            <ProductInfo
              product={product}
              averageRating={averageRating}
              reviewsCount={reviews.length}
            />

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border/20 shadow-[0_4px_20px_rgba(84,67,60,0.04)]">
                <Leaf className="text-primary w-6 h-6 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-bold text-foreground font-body">
                    Nguồn gốc bền vững
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nguyên liệu đạo đức, chế tác tỉ mỉ.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border/20 shadow-[0_4px_20px_rgba(84,67,60,0.04)]">
                <History className="text-primary w-6 h-6 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-bold text-foreground font-body">
                    Độc bản duy nhất
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sản phẩm chất lượng cao, độc đáo và tinh tế.
                  </p>
                </div>
              </div>
            </div>

            <ProductActions
              product={product}
              quantity={quantity}
              setQuantity={setQuantity}
              onAddToCart={handleAddToCart}
              isAdding={isAdding}
              addedSuccess={addedSuccess}
              onOpenChat={openChat}
            />

            <div className="border-t border-border/30 pt-8 space-y-6">
              <details className="group">
                <summary className="list-none flex justify-between items-center cursor-pointer select-none">
                  <span className="font-bold text-foreground tracking-tight hover:text-primary transition-colors">
                    Kích thước & Bảo quản
                  </span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <div className="pt-4 text-muted-foreground text-sm leading-relaxed space-y-2 font-body animate-in slide-in-from-top-2 fade-in duration-300">
                  <p>Mã sản phẩm: {product.sku || "N/A"}</p>
                  <p>
                    Khuyên dùng giặt hoặc rửa tay để bảo toàn độ hoàn thiện và
                    tính nguyên bản theo thời gian.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>

        <ProductStory product={product} artisanImage={artisanImage} />

        <ProductReviews
          reviews={reviews}
          averageRating={averageRating}
          isReviewsLoading={isReviewsLoading}
        />

        <ProductQuestionsSection
          productId={product.id}
          sellerId={product.sellerId}
          currentUser={user}
          isAuthenticated={isAuthenticated}
        />

        <RelatedProducts
          categoryId={product.categoryId}
          categorySlug={product.category?.slug}
          currentProductId={product.id}
        />
      </main>

      <CustomerFooter />
    </div>
  );
}
