"use client";

import Image, { type ImageProps } from "next/image";
import { ShoppingBag } from "lucide-react";
import { useState, type ReactNode } from "react";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: ReactNode;
  fallbackClassName?: string;
};

export function SafeImage({
  src,
  alt,
  fallback,
  fallbackClassName = "h-full w-full",
  onError,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      fallback ?? (
        <div
          className={`flex items-center justify-center bg-accent text-muted-foreground ${fallbackClassName}`}
        >
          <ShoppingBag className="h-10 w-10 opacity-30" />
        </div>
      )
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
