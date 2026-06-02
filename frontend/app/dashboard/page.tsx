"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  Flag,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  TrendingUp,
  PieChart as PieChartIcon,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  useMe,
  useAdminOrders,
  useAdminReports,
  useProductStats,
  useSellerOrders,
  useSellerRevenueOverTime,
  useSellerRevenueByCategory,
  useUserStats,
} from "@/lib/api/hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfMonth } from "date-fns";
import { vi } from "date-fns/locale";

// Standard Colors for Artisan Aesthetic
const COLORS = [
  "#853724",
  "#576957",
  "#4f4537",
  "#a44e39",
  "#7a2f1c",
  "#c2b2a3",
];

const chartAxisColor = "var(--muted-foreground)";
const chartGridColor = "var(--border)";

type SellerDashboardOrder = NonNullable<
  ReturnType<typeof useSellerOrders>["data"]
>[number];

function getOrderAmount(order: SellerDashboardOrder) {
  return Number(order.subTotal ?? 0);
}

function getOrderCustomer(order: SellerDashboardOrder) {
  return (
    order.order?.customer ?? { id: order.id, name: "Khách hàng", email: "" }
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-xl">
      <p className="text-xs font-semibold">
        {label ? format(new Date(label), "dd MMMM yyyy", { locale: vi }) : ""}
      </p>
      <p className="mt-1 text-sm font-medium text-primary">
        Doanh thu: {formatCurrency(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user, isLoading: isUserLoading } = useMe();
  const isSeller = user?.roles.includes("ROLE_SELLER") ?? false;
  const isAdmin = user?.roles.includes("ROLE_ADMIN") ?? false;

  // Date Range State for Bar Chart
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [selectedPreset, setSelectedPreset] = useState("30days");

  // Month Selector State for Pie Chart
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data Hooks
  const { data: revenueOverTime, isLoading: isRevLoading } =
    useSellerRevenueOverTime(dateRange.startDate, dateRange.endDate, isSeller);
  const { data: categoryRevenue, isLoading: isCatLoading } =
    useSellerRevenueByCategory(selectedMonth, selectedYear, isSeller);
  const { data: recentOrders, isLoading: isOrdersLoading } =
    useSellerOrders(isSeller);
  const { data: userStats, isLoading: isUserStatsLoading } =
    useUserStats(isAdmin);
  const { data: productStats, isLoading: isProductStatsLoading } =
    useProductStats();
  const { data: adminOrders, isLoading: isAdminOrdersLoading } = useAdminOrders(
    undefined,
    isAdmin,
  );
  const { data: pendingReports, isLoading: isPendingReportsLoading } =
    useAdminReports({ status: "PENDING", page: 1, limit: 5 }, isAdmin);

  // Formatters
  const formatShortCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
    }
    return value.toLocaleString("vi-VN");
  };

  const handlePresetChange = (preset: string | null) => {
    if (!preset) return;
    setSelectedPreset(preset);
    const today = new Date();
    let start: Date;

    switch (preset) {
      case "7days":
        start = subDays(today, 7);
        break;
      case "30days":
        start = subDays(today, 30);
        break;
      case "90days":
        start = subDays(today, 90);
        break;
      case "thisMonth":
        start = startOfMonth(today);
        break;
      default:
        start = subDays(today, 30);
    }

    setDateRange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    });
  };

  const stats = useMemo(() => {
    if (!recentOrders) return [];

    const sevenDaysAgo = subDays(new Date(), 7).getTime();
    const totalRevenue = recentOrders
      .filter((o) =>
        ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status),
      )
      .reduce((acc, curr) => acc + getOrderAmount(curr), 0);

    const newOrders = recentOrders.filter(
      (o) =>
        o.status !== "CANCELLED" &&
        new Date(o.createdAt).getTime() >= sevenDaysAgo,
    ).length;
    const totalOrders = recentOrders.length;
    const uniqueCustomerCount = new Set(
      recentOrders.map((order) => getOrderCustomer(order).id),
    ).size;

    return [
      {
        title: "Tổng doanh thu",
        value: formatCurrency(totalRevenue),
        change: 12.5,
        icon: DollarSign,
        iconColor: "text-[#853724]",
      },
      {
        title: "Đơn hàng mới",
        value: newOrders,
        change: 2,
        icon: ShoppingCart,
        iconColor: "text-[#576957]",
      },
      {
        title: "Tổng đơn hàng",
        value: totalOrders,
        change: 15,
        icon: TrendingUp,
        iconColor: "text-[#7a2f1c]",
      },
      {
        title: "Khách hàng",
        value: uniqueCustomerCount,
        change: 5,
        icon: Users,
        iconColor: "text-[#4f4537]",
      },
    ];
  }, [recentOrders]);

  const adminStats = useMemo(() => {
    const orders = adminOrders ?? [];
    const revenueStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
    const totalRevenue = orders
      .filter((order) => revenueStatuses.includes(order.status))
      .reduce((acc, order) => acc + Number(order.totalAmount ?? 0), 0);

    return [
      {
        title: "Doanh thu sàn",
        value: formatCurrency(totalRevenue),
        icon: DollarSign,
        iconColor: "text-[#853724]",
      },
      {
        title: "Đơn hàng toàn sàn",
        value: orders.length,
        icon: ShoppingCart,
        iconColor: "text-[#576957]",
      },
      {
        title: "Sản phẩm chờ duyệt",
        value: productStats?.pending ?? 0,
        icon: Package,
        iconColor: "text-[#7a2f1c]",
      },
      {
        title: "Báo cáo mới",
        value: pendingReports?.meta?.total ?? 0,
        icon: Flag,
        iconColor: "text-[#4f4537]",
      },
    ];
  }, [adminOrders, pendingReports?.meta?.total, productStats?.pending]);

  const adminRecentOrders = useMemo(() => {
    return (adminOrders ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [adminOrders]);

  const adminOverviewLoading =
    isAdminOrdersLoading ||
    isProductStatsLoading ||
    isUserStatsLoading ||
    isPendingReportsLoading;

  const getStatusBadge = (status: string) => {
    const styleMap: Record<string, string> = {
      PENDING: "bg-[#fef3c7] text-[#92400e]",
      PAID: "bg-[#fde68a] text-[#78350f]",
      PROCESSING: "bg-[#e0f2fe] text-[#0369a1]",
      SHIPPED: "bg-[#d4e8d1] text-[#576957]",
      DELIVERED: "bg-[#dbeafe] text-[#1d4ed8]",
      CANCELLED: "bg-[#fee2e2] text-[#991b1b]",
    };

    const statusText: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      PAID: "Đã thanh toán",
      PROCESSING: "Đang chuẩn bị",
      SHIPPED: "Đang giao",
      DELIVERED: "Đã giao hàng",
      CANCELLED: "Đã hủy",
    };

    return (
      <Badge
        className={`${styleMap[status] || "bg-muted text-muted-foreground"} border-0 font-bold text-[10px] tracking-widest uppercase`}
      >
        {statusText[status] || status}
      </Badge>
    );
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="artisan-title text-5xl">Tổng quan vận hành sàn</h1>
            <p className="artisan-subtitle mt-2 italic text-stone-500 dark:text-muted-foreground">
              Theo dõi đơn hàng, sản phẩm chờ duyệt, người dùng và báo cáo mới trên marketplace.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-border/40 shadow-sm dark:bg-card">
            <Calendar className="w-4 h-4 text-primary/50" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
              Hôm nay, {format(new Date(), "dd/MM/yyyy")}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {adminOverviewLoading
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-32 bg-white rounded-xl border border-border/40 animate-pulse dark:bg-card"
                  />
                ))
            : adminStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif italic text-2xl text-primary">
                Đơn hàng gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                      Đơn hàng
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                      Khách hàng
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                      Người bán
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">
                      Giá trị
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                      Trạng thái
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdminOrdersLoading ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell
                            colSpan={5}
                            className="h-12 bg-muted/10 animate-pulse"
                          />
                        </TableRow>
                      ))
                  ) : adminRecentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Chưa có đơn hàng nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminRecentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.customer?.name || "Khách hàng"}
                            </span>
                            <span className="text-[10px] text-muted-foreground italic">
                              {order.customer?.email || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(order.subOrders || [])
                            .map(
                              (subOrder) =>
                                subOrder.seller?.shopName ||
                                subOrder.seller?.name,
                            )
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </TableCell>
                        <TableCell className="text-right font-serif italic text-lg text-primary">
                          {formatCurrency(Number(order.totalAmount ?? 0))}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif italic text-2xl text-primary">
                Vận hành nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Người dùng
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {userStats?.total ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {userStats?.sellers ?? 0} người bán, {userStats?.customers ?? 0} khách hàng
                </p>
              </div>

              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Sản phẩm
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {productStats?.total ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {productStats?.approved ?? 0} đã duyệt, {productStats?.pending ?? 0} chờ duyệt
                </p>
              </div>

              <div className="rounded-lg border border-border/50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Báo cáo chờ xử lý
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {pendingReports?.meta?.total ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dữ liệu lấy từ hàng đợi báo cáo admin.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="artisan-subtitle italic">
          Vui lòng truy cập trang cá nhân để xem thông tin mua hàng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="artisan-title text-5xl">
            Bảng điều khiển {user?.shopName}
          </h1>
          <p className="artisan-subtitle mt-2 italic text-stone-500 dark:text-muted-foreground">
            Giám sát hoạt động kinh doanh và hành trình của các sản phẩm.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-border/40 shadow-sm dark:bg-card">
          <Calendar className="w-4 h-4 text-primary/50" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
            Hôm nay, {format(new Date(), "dd/MM/yyyy")}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {isOrdersLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-white rounded-xl border border-border/40 animate-pulse dark:bg-card"
                />
              ))
          : stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-border/40 shadow-md transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="font-serif italic text-2xl text-primary">
                Biểu đồ Doanh thu
              </CardTitle>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mt-1 dark:text-muted-foreground">
                Thống kê theo dòng chảy thời gian
              </p>
            </div>
            <Select onValueChange={handlePresetChange} value={selectedPreset}>
              <SelectTrigger className="w-[180px] h-9 text-xs font-bold uppercase tracking-widest border-border/50">
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 ngày qua</SelectItem>
                <SelectItem value="30days">30 ngày qua</SelectItem>
                <SelectItem value="90days">3 tháng qua</SelectItem>
                <SelectItem value="thisMonth">Tháng này</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {isRevLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueOverTime}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={chartGridColor}
                      opacity={0.55}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => format(new Date(str), "dd/MM")}
                      tick={{ fontSize: 10, fill: chartAxisColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatShortCurrency}
                      tick={{ fontSize: 10, fill: chartAxisColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<RevenueTooltip />}
                      cursor={{ fill: "var(--muted)", opacity: 0.18 }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="url(#colorRevenue)"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ffb4a2"
                          stopOpacity={0.92}
                        />
                        <stop
                          offset="95%"
                          stopColor="#853724"
                          stopOpacity={0.82}
                        />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-border/40 shadow-md transition-all hover:shadow-lg">
          <CardHeader className="flex flex-col space-y-4 pb-7">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif italic text-2xl text-primary">
                Phân loại
              </CardTitle>
              <PieChartIcon className="w-5 h-5 text-primary/30" />
            </div>
            <div className="flex gap-2">
              <Select
                onValueChange={(val) => {
                  if (val) setSelectedMonth(parseInt(val));
                }}
                value={selectedMonth.toString()}
              >
                <SelectTrigger className="flex-1 h-9 text-xs font-bold uppercase tracking-widest border-border/50">
                  <SelectValue placeholder="Tháng" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Tháng {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(val) => {
                  if (val) setSelectedYear(parseInt(val));
                }}
                value={selectedYear.toString()}
              >
                <SelectTrigger className="flex-1 h-9 text-xs font-bold uppercase tracking-widest border-border/50">
                  <SelectValue placeholder="Năm" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((yr) => (
                    <SelectItem key={yr} value={yr.toString()}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {isCatLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                </div>
              ) : !categoryRevenue || categoryRevenue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <PieChartIcon className="w-12 h-12 text-muted-foreground/10 mb-4" />
                  <p className="text-xs italic text-muted-foreground">
                    Chưa có dữ liệu trong tháng này
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryRevenue}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryRevenue.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) =>
                        formatCurrency(Number(value))
                      }
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        fontWeight: "bold",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="font-serif italic text-2xl text-primary">
            Vận trình Kiện hàng Gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  Kiện hàng
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  Tri kỷ (Khách hàng)
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">
                  Trị giá
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  Trạng thái
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">
                  Thời điểm
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading
                ? Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          colSpan={5}
                          className="h-12 bg-muted/10 animate-pulse"
                        />
                      </TableRow>
                    ))
                : recentOrders?.slice(0, 5).map((subOrder) => {
                    const customer = getOrderCustomer(subOrder);

                    return (
                      <TableRow
                        key={subOrder.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          #{subOrder.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.name}</span>
                            <span className="text-[10px] text-muted-foreground italic">
                              {customer.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-serif italic text-lg text-primary">
                          {formatCurrency(getOrderAmount(subOrder))}
                        </TableCell>
                        <TableCell>{getStatusBadge(subOrder.status)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm italic">
                          {new Date(subOrder.createdAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
