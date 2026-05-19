"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList } from "lucide-react";
import { commissionsApi } from "@/lib/api/commissions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SellerCommissionsPage() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["commissions", "open"],
    queryFn: commissionsApi.getOpenPosts,
  });

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Đang tải commission...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-5">
        <h1 className="font-serif text-3xl font-bold text-foreground">Bảng commission</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xem yêu cầu mới từ khách hàng và gửi đề xuất để bắt đầu đơn thiết kế riêng.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card p-12 text-center text-card-foreground shadow-sm">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="font-serif text-xl font-bold">Chưa có commission đang mở</h2>
          <p className="mt-2 text-sm text-muted-foreground">Các yêu cầu mới từ khách hàng sẽ xuất hiện ở đây.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/commissions/${post.id}`}
              className="rounded-lg border border-border/60 bg-card p-5 text-card-foreground shadow-sm transition hover:border-primary/40 hover:bg-accent/25"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {formatDate(post.createdAt)}
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {post.proposals.length} đề xuất
                </span>
              </div>
              <h2 className="font-serif text-xl font-bold text-foreground">{post.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.description}</p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="text-sm font-semibold">
                  {post.budgetMin || post.budgetMax
                    ? `${post.budgetMin ? formatCurrency(Number(post.budgetMin)) : "?"} - ${
                        post.budgetMax ? formatCurrency(Number(post.budgetMax)) : "?"
                      }`
                    : "Khách chưa đặt ngân sách"}
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
