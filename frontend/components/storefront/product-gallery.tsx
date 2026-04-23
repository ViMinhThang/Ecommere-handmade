"use client";

import Image from "next/image";
import { mediaApi } from "@/lib/api/media";

interface ProductImage {
  url: string;
  isMain: boolean;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  if (!images || images.length === 0) {
    return (
      <div className="lg:col-span-7 grid grid-cols-2 gap-4">
        <div className="col-span-2 rounded-lg bg-surface-container-low h-[600px] flex items-center justify-center text-muted-foreground italic">
          Không có hình ảnh
        </div>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => (a.isMain === b.isMain ? 0 : a.isMain ? -1 : 1));
  const mainImage = sortedImages[0];
  const secondaryImages = sortedImages.slice(1, 3); 
  const resolveImageUrl = (url: string) => mediaApi.getImageUrl(url);

  return (
    <div className="lg:col-span-7 grid grid-cols-2 gap-4 h-max">
      <div className="col-span-2 overflow-hidden rounded-xl bg-surface-container-low shadow-sm group">
        <div className="w-full h-[600px] relative">
          <Image
            src={resolveImageUrl(mainImage.url)}
            alt={`${productName} - Main View`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            priority
          />
        </div>
      </div>

      {/* Secondary Images */}
      {secondaryImages.map((img, idx) => (
        <div key={idx} className="rounded-xl overflow-hidden h-64 relative group bg-surface-container-low">
          <Image
            src={resolveImageUrl(img.url)}
            alt={`${productName} - Detail ${idx + 1}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
      ))}
    </div>
  );
}
