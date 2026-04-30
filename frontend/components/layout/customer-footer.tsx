"use client";

import Link from "next/link";
import { Camera, Share2 } from "lucide-react";

export function CustomerFooter() {
  return (
    <footer className="mt-24 w-full bg-accent dark:bg-[#151512]">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-12 px-12 py-20 md:grid-cols-2">
        <div>
          <Link
            href="/"
            className="mb-6 block text-lg font-headline italic text-primary"
          >
            The Artisanal Curator
          </Link>
          <p className="mb-8 max-w-sm font-body text-muted-foreground">
            Giữ gìn giá trị con người trong thế giới kỹ thuật số. Tham gia hành
            trình thủ công của chúng tôi.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="-ml-2 p-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Share2 className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              className="-ml-2 p-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Camera className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h5 className="mb-6 font-headline italic text-foreground">
              Bộ sưu tập
            </h5>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/categories/birthday"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Sinh nhật
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/wedding"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Đám cưới
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/anniversary"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Kỷ niệm
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/thank-you"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Cảm ơn
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="mb-6 font-headline italic text-foreground">
              Xưởng chế tác
            </h5>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/discovery"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Câu chuyện người bán
                </Link>
              </li>
              <li>
                <Link
                  href="/sellers"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Khám phá gian hàng
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/custom-orders/new"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Đặt hàng thiết kế riêng
                </Link>
              </li>
              <li>
                <Link
                  href="/profile/orders"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Giao hàng và đổi trả
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm tracking-wide text-muted-foreground transition-all hover:text-primary font-body"
                >
                  Trở thành đối tác
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/10 px-12 py-8 text-center">
        <p className="text-sm tracking-wide text-muted-foreground font-body">
          (c) <span suppressHydrationWarning>{new Date().getFullYear()}</span>{" "}
          The Artisanal Curator. Chế tác với tâm hồn.
        </p>
      </div>
    </footer>
  );
}
