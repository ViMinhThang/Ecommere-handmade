"use client";

import { FormEvent, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  History,
  Loader2,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminRewardLedger,
  useAdminRewardSummary,
  useAdminRewardUsers,
  useAdjustAdminRewardPoints,
} from "@/lib/api/hooks";
import type { RewardPointLedgerType } from "@/lib/api/rewards";
import { mediaApi } from "@/lib/api/media";
import { cn, getErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 10;
const MAX_ADJUSTMENT = 10_000;

const ledgerLabels: Record<RewardPointLedgerType, string> = {
  EARN: "Nhận từ đơn hàng",
  REDEEM: "Đổi điểm",
  REFUND: "Hoàn điểm",
  ADJUSTMENT: "Admin điều chỉnh",
  EXPIRE: "Hết hạn",
};

function formatPoints(points: number) {
  return new Intl.NumberFormat("vi-VN").format(points);
}

export default function AdminRewardsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const summaryQuery = useAdminRewardSummary();
  const usersQuery = useAdminRewardUsers(query, page, PAGE_SIZE);
  const users = usersQuery.data?.data ?? [];
  const summary = summaryQuery.data;
  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;
  const ledgerQuery = useAdminRewardLedger(selectedUser?.id ?? "", 1, 20);
  const adjustPoints = useAdjustAdminRewardPoints();

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const resetAdjustment = () => {
    setAmount("");
    setReason("");
    setDirection("add");
  };

  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    const normalizedAmount = Math.floor(Number(amount));
    if (
      !Number.isInteger(normalizedAmount) ||
      normalizedAmount < 1 ||
      normalizedAmount > MAX_ADJUSTMENT
    ) {
      toast.error(`Số điểm phải từ 1 đến ${formatPoints(MAX_ADJUSTMENT)}.`);
      return;
    }
    if (reason.trim().length < 5) {
      toast.error("Lý do phải có ít nhất 5 ký tự.");
      return;
    }

    const points = direction === "add" ? normalizedAmount : -normalizedAmount;
    try {
      await adjustPoints.mutateAsync({
        userId: selectedUser.id,
        points,
        reason: reason.trim(),
      });
      toast.success(
        `${points > 0 ? "Đã cộng" : "Đã trừ"} ${formatPoints(normalizedAmount)} điểm cho ${selectedUser.name}.`,
      );
      setIsAdjustOpen(false);
      resetAdjustment();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể điều chỉnh điểm thưởng."));
    }
  };

  const pendingPoints = Math.floor(Number(amount)) || 0;
  const nextBalance = selectedUser
    ? selectedUser.rewardPointsBalance +
      (direction === "add" ? pendingPoints : -pendingPoints)
    : 0;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Chương trình khách hàng thân thiết
          </p>
          <h1 className="artisan-title text-4xl">Điểm thưởng</h1>
          <p className="mt-2 text-muted-foreground">
            Theo dõi số dư, lịch sử và điều chỉnh điểm với nhật ký minh bạch.
          </p>
        </div>
        <Button disabled={!selectedUser} onClick={() => setIsAdjustOpen(true)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Điều chỉnh điểm
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Coins}
          label="Điểm đang lưu hành"
          value={summary?.totalPoints ?? 0}
          iconClassName="bg-primary/10 text-primary"
        />
        <SummaryCard
          icon={Users}
          label="Khách hàng có điểm"
          value={summary?.usersWithPoints ?? 0}
          iconClassName="bg-emerald-500/10 text-emerald-700"
        />
        <SummaryCard
          icon={History}
          label="Lần admin điều chỉnh"
          value={summary?.adjustments ?? 0}
          iconClassName="bg-amber-500/10 text-amber-700"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Card>
          <CardHeader className="gap-4">
            <CardTitle>Khách hàng</CardTitle>
            <form className="flex gap-2" onSubmit={submitSearch}>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Tìm người dùng"
                  className="pl-9"
                  name="reward-user-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Tên hoặc email khách hàng…"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <Button type="submit" variant="outline">Tìm</Button>
            </form>
          </CardHeader>
          <CardContent className="space-y-2">
            {usersQuery.isLoading ? (
              <LoadingState label="Đang tải khách hàng…" />
            ) : users.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                Không tìm thấy khách hàng phù hợp.
              </p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    selectedUser?.id === user.id && "border-primary/40 bg-primary/5",
                  )}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar ? mediaApi.getImageUrl(user.avatar) : ""} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{user.email}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums text-primary">
                      {formatPoints(user.rewardPointsBalance)} điểm
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.ledgerEntries} giao dịch
                    </span>
                  </span>
                </button>
              ))
            )}
            <Pagination
              page={page}
              limit={PAGE_SIZE}
              total={usersQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử gần đây</CardTitle>
            {selectedUser ? (
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-muted-foreground">
                  {selectedUser.name} · {selectedUser.email}
                </p>
                <Badge variant="outline">
                  {formatPoints(selectedUser.rewardPointsBalance)} điểm
                </Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {ledgerQuery.isLoading ? (
              <LoadingState />
            ) : !selectedUser ? (
              <EmptyState label="Chọn một khách hàng để xem lịch sử." />
            ) : ledgerQuery.data?.data.length === 0 ? (
              <EmptyState label="Khách hàng này chưa có giao dịch điểm." />
            ) : (
              <div className="space-y-1">
                {ledgerQuery.data?.data.map((entry) => {
                  const isPositive = entry.points > 0;
                  return (
                    <div key={entry.id} className="flex gap-3 border-b border-border/60 py-3 last:border-0">
                      <div className={cn("mt-0.5", isPositive ? "text-emerald-700" : "text-destructive")}>
                        {isPositive ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <p className="font-medium">{ledgerLabels[entry.type]}</p>
                          <p className={cn("font-semibold", isPositive ? "text-emerald-700" : "text-destructive")}>
                            {isPositive ? "+" : ""}{formatPoints(entry.points)}
                          </p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {entry.description || "Không có mô tả"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("vi-VN")} · Số dư {formatPoints(entry.balanceAfter)}
                        </p>
                        {entry.adjustedByAdminId ? (
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            Admin ID: {entry.adjustedByAdminId}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isAdjustOpen}
        onOpenChange={(open) => {
          setIsAdjustOpen(open);
          if (!open) resetAdjustment();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitAdjustment}>
            <DialogHeader>
              <DialogTitle>Điều chỉnh điểm thưởng</DialogTitle>
              <DialogDescription>
                Mọi thay đổi đều được lưu vĩnh viễn trong lịch sử của {selectedUser?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-5">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={direction === "add" ? "default" : "outline"} onClick={() => setDirection("add")}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />Cộng điểm
                </Button>
                <Button type="button" variant={direction === "subtract" ? "destructive" : "outline"} onClick={() => setDirection("subtract")}>
                  <ArrowDownCircle className="mr-2 h-4 w-4" />Trừ điểm
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-amount">Số điểm</Label>
                <Input
                  id="reward-amount"
                  name="reward-amount"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  min={1}
                  max={MAX_ADJUSTMENT}
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tối đa {formatPoints(MAX_ADJUSTMENT)} điểm mỗi lần.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-reason">Lý do</Label>
                <Textarea
                  id="reward-reason"
                  name="reward-reason"
                  autoComplete="off"
                  minLength={5}
                  maxLength={200}
                  required
                  placeholder="Ví dụ: Bù điểm do đơn hàng gặp sự cố"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <div className={cn(
                "flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3",
                nextBalance < 0 && "border-destructive/40 bg-destructive/5",
              )}>
                <span className="text-sm text-muted-foreground">Số dư sau điều chỉnh</span>
                <strong className="tabular-nums">{formatPoints(nextBalance)} điểm</strong>
              </div>
              {nextBalance < 0 ? (
                <p className="text-sm text-destructive">Không thể trừ quá số điểm hiện có.</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={adjustPoints.isPending || nextBalance < 0}>
                {adjustPoints.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Xác nhận điều chỉnh
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  iconClassName,
}: {
  icon: typeof Coins;
  label: string;
  value: number;
  iconClassName: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("rounded-full p-3", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{formatPoints(value)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-12 text-center text-muted-foreground">{label}</p>;
}
