"use client"

import { useState, useMemo } from "react"
import { DollarSign, ShoppingCart, Users, Calendar, TrendingUp, PieChart as PieChartIcon, Loader2 } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { 
  useMe, 
  useSellerOrders, 
  useSellerRevenueOverTime, 
  useSellerRevenueByCategory 
} from "@/lib/api/hooks"
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
  Legend
} from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"

// Standard Colors for Artisan Aesthetic
const COLORS = ["#853724", "#576957", "#4f4537", "#a44e39", "#7a2f1c", "#c2b2a3"]

export default function DashboardPage() {
  const { data: user } = useMe()
  const isSeller = user?.roles.includes("ROLE_SELLER")

  // Date Range State for Bar Chart
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  })

  // Month Selector State for Pie Chart
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Data Hooks
  const { data: revenueOverTime, isLoading: isRevLoading } = useSellerRevenueOverTime(dateRange.startDate, dateRange.endDate)
  const { data: categoryRevenue, isLoading: isCatLoading } = useSellerRevenueByCategory(selectedMonth, selectedYear)
  const { data: recentOrders, isLoading: isOrdersLoading } = useSellerOrders()

  // Formatters
  const formatShortCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`
    }
    return value.toLocaleString('vi-VN')
  }

  const handlePresetChange = (preset: string | null) => {
    if (!preset) return
    const today = new Date()
    let start: Date
    
    switch (preset) {
      case "7days":
        start = subDays(today, 7)
        break
      case "30days":
        start = subDays(today, 30)
        break
      case "90days":
        start = subDays(today, 90)
        break
      case "thisMonth":
        start = startOfMonth(today)
        break
      default:
        start = subDays(today, 30)
    }

    setDateRange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    })
  }

  const stats = useMemo(() => {
    if (!recentOrders) return []
    
    const totalRevenue = recentOrders
      .filter(o => ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status))
      .reduce((acc, curr) => acc + Number(curr.subTotal), 0)

    const pendingOrders = recentOrders.filter(o => o.status === "PAID").length
    const totalOrders = recentOrders.length

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
        value: pendingOrders,
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
        value: new Set(recentOrders.map(o => o.order.customer.id)).size,
        change: 5,
        icon: Users,
        iconColor: "text-[#4f4537]",
      },
    ]
  }, [recentOrders])

  const getStatusBadge = (status: string) => {
    const styleMap: Record<string, string> = {
      PENDING: "bg-[#fef3c7] text-[#92400e]",
      PAID: "bg-[#fde68a] text-[#78350f]",
      PROCESSING: "bg-[#e0f2fe] text-[#0369a1]",
      SHIPPED: "bg-[#d4e8d1] text-[#576957]",
      DELIVERED: "bg-[#dbeafe] text-[#1d4ed8]",
      CANCELLED: "bg-[#fee2e2] text-[#991b1b]",
    }

    const statusText: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      PAID: "Đã thanh toán",
      PROCESSING: "Đang chuẩn bị",
      SHIPPED: "Đang giao",
      DELIVERED: "Đã giao hàng",
      CANCELLED: "Đã hủy",
    }

    return (
      <Badge className={`${styleMap[status] || "bg-muted text-muted-foreground"} border-0 font-bold text-[10px] tracking-widest uppercase`}>
        {statusText[status] || status}
      </Badge>
    )
  }

  if (!isSeller && user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="artisan-subtitle italic">Vui lòng truy cập trang cá nhân để xem thông tin mua hàng.</p>
      </div>
    )
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="artisan-title text-5xl">Bảng điều khiển {user?.shopName}</h1>
          <p className="artisan-subtitle mt-2 italic text-stone-500">Giám sát hoạt động kinh doanh và hành trình của các sản phẩm.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-border/40 shadow-sm">
          <Calendar className="w-4 h-4 text-primary/50" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Hôm nay, {format(new Date(), "dd/MM/yyyy")}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {isOrdersLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-border/40 animate-pulse" />
          ))
        ) : (
          stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-border/40 shadow-md transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="font-serif italic text-2xl text-primary">Biểu đồ Doanh thu</CardTitle>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mt-1">Thống kê theo dòng chảy thời gian</p>
            </div>
            <Select onValueChange={handlePresetChange} defaultValue="30days">
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => format(new Date(str), "dd/MM")}
                      tick={{ fontSize: 10, fill: '#888' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatShortCurrency}
                      tick={{ fontSize: 10, fill: '#888' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), "Doanh thu"]}
                      labelFormatter={(label) => format(new Date(label), "dd MMMM yyyy", { locale: require('date-fns/locale/vi') })}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="url(#colorRevenue)" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30}
                    />
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#853724" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a44e39" stopOpacity={0.8}/>
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
              <CardTitle className="font-serif italic text-2xl text-primary">Phân loại</CardTitle>
              <PieChartIcon className="w-5 h-5 text-primary/30" />
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(val) => { if(val) setSelectedMonth(parseInt(val)) }} defaultValue={selectedMonth.toString()}>
                <SelectTrigger className="flex-1 h-9 text-xs font-bold uppercase tracking-widest border-border/50">
                  <SelectValue placeholder="Tháng" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>Tháng {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(val) => { if(val) setSelectedYear(parseInt(val)) }} defaultValue={selectedYear.toString()}>
                <SelectTrigger className="flex-1 h-9 text-xs font-bold uppercase tracking-widest border-border/50">
                  <SelectValue placeholder="Năm" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((yr) => (
                    <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>
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
                  <p className="text-xs italic text-muted-foreground">Chưa có dữ liệu trong tháng này</p>
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
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
          <CardTitle className="font-serif italic text-2xl text-primary">Vận trình Kiện hàng Gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Kiện hàng</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Tri kỷ (Khách hàng)</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Trị giá</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Trạng thái</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Thời điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="h-12 bg-muted/10 animate-pulse" />
                  </TableRow>
                ))
              ) : recentOrders?.slice(0, 5).map((subOrder) => (
                <TableRow key={subOrder.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-primary">#{subOrder.id.slice(0,8)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{subOrder.order.customer.name}</span>
                      <span className="text-[10px] text-muted-foreground italic">{subOrder.order.customer.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-serif italic text-lg text-primary">{formatCurrency(subOrder.subTotal)}</TableCell>
                  <TableCell>{getStatusBadge(subOrder.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm italic">
                    {new Date(subOrder.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}