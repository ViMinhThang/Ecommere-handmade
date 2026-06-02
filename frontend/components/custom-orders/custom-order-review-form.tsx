"use client";

import { useState } from "react";
import { Star, Upload, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customOrdersApi } from "@/lib/api/custom-orders";
import { mediaApi } from "@/lib/api/media";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CustomOrderReviewFormProps {
  customOrderId: string;
}

export function CustomOrderReviewForm({
  customOrderId,
}: CustomOrderReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createReviewMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string; images?: string[] }) =>
      customOrdersApi.createReview(customOrderId, data),
    onSuccess: () => {
      toast.success("Đánh giá của bạn đã được gửi thành công!");
      queryClient.invalidateQueries({ queryKey: ["custom-order-review", customOrderId] });
      setRating(5);
      setComment("");
      setImages([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      if (!user?.id) {
        throw new Error("Vui lòng đăng nhập để tải ảnh đánh giá.");
      }

      const folders = await mediaApi.getFolders(user.id);
      let folderId = folders.find((folder) => folder.name === "Đánh giá")?.id;

      if (!folderId) {
        const folder = await mediaApi.createFolder(user.id, {
          name: "Đánh giá",
        });
        folderId = folder.id;
      }

      const targetFolderId = folderId;
      const uploadPromises = Array.from(files).map(async (file) => {
        const response = await mediaApi.uploadImage(
          targetFolderId,
          file,
          file.name,
        );
        return response.path;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...uploadedUrls]);
      toast.success("Ảnh đã được tải lên thành công!");
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating < 1 || rating > 5) {
      toast.error("Vui lòng chọn số sao từ 1 đến 5");
      return;
    }

    createReviewMutation.mutate({
      rating,
      comment: comment.trim() || undefined,
      images: images.length > 0 ? images : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Đánh giá của bạn
        </label>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i + 1)}
              onMouseEnter={() => setHoveredRating(i + 1)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  i < (hoveredRating || rating)
                    ? "fill-primary text-primary"
                    : "text-muted"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="comment"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Nhận xét (tùy chọn)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full rounded-lg border border-border/30 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {comment.length}/1000 ký tự
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Hình ảnh (tùy chọn)
        </label>
        <div className="space-y-3">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={mediaApi.getImageUrl(url)}
                    alt={`Review ${index + 1}`}
                    className="h-24 w-24 rounded-lg border border-border/30 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/20 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-muted/30">
            <Upload className="h-4 w-4" />
            {isUploading ? "Đang tải lên..." : "Tải ảnh lên"}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={createReviewMutation.isPending || isUploading}
        className="w-full gap-2 bg-primary hover:bg-primary/90"
      >
        {createReviewMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
      </Button>
    </form>
  );
}
