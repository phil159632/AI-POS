import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateRange = "today" | "week" | "month";

export default function Reports() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("today");

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    const storedStoreId = localStorage.getItem("selectedStoreId");
    if (storedStoreId) {
      setSelectedStoreId(Number(storedStoreId));
    }
  }, [isAuthenticated, setLocation]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    const endDate = new Date(now.setHours(23, 59, 59, 999));

    switch (dateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now.setDate(now.getDate() - 30));
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: revenue, isLoading: revenueLoading } = trpc.report.revenue.useQuery(
    {
      storeId: selectedStoreId!,
      startDate,
      endDate,
    },
    { enabled: !!selectedStoreId }
  );

  const { data: topSelling, isLoading: topSellingLoading } = trpc.report.topSelling.useQuery(
    {
      storeId: selectedStoreId!,
      startDate,
      endDate,
      limit: 10,
    },
    { enabled: !!selectedStoreId }
  );

  if (revenueLoading || topSellingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalRevenue = revenue?.totalRevenue || 0;
  const totalOrders = revenue?.totalOrders || 0;
  const cashRevenue = revenue?.cashRevenue || 0;
  const bankTransferRevenue = revenue?.bankTransferRevenue || 0;
  const creditCardRevenue = revenue?.creditCardRevenue || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">報表統計</h1>
              <p className="text-sm text-gray-500">營業額與銷售分析</p>
            </div>
          </div>

          <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">近7天</SelectItem>
              <SelectItem value="month">近30天</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* 營業額概覽 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總營業額</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(totalRevenue / 100).toFixed(0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {dateRange === "today" ? "今日" : dateRange === "week" ? "近7天" : "近30天"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">訂單數量</CardTitle>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
              <p className="text-xs text-gray-500 mt-1">
                總訂單數
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均客單價</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ${totalOrders > 0 ? ((totalRevenue / totalOrders) / 100).toFixed(0) : 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                每筆訂單平均
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">時間範圍</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-orange-600">
                {startDate.toLocaleDateString("zh-TW")}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                至 {endDate.toLocaleDateString("zh-TW")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 付款方式統計 */}
        <Card>
          <CardHeader>
            <CardTitle>付款方式統計</CardTitle>
            <CardDescription>各付款方式的營業額分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">現金</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    ${(cashRevenue / 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {totalRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">銀行轉帳</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">
                    ${(bankTransferRevenue / 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {totalRevenue > 0 ? ((bankTransferRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">信用卡</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600">
                    ${(creditCardRevenue / 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {totalRevenue > 0 ? ((creditCardRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 熱銷品項 */}
        <Card>
          <CardHeader>
            <CardTitle>熱銷品項 TOP 10</CardTitle>
            <CardDescription>最受歡迎的菜單品項</CardDescription>
          </CardHeader>
          <CardContent>
            {topSelling && topSelling.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排名</TableHead>
                    <TableHead>品項名稱</TableHead>
                    <TableHead className="text-right">銷售數量</TableHead>
                    <TableHead className="text-right">銷售額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSelling.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-bold">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                          index === 0 ? "bg-yellow-500" :
                          index === 1 ? "bg-gray-400" :
                          index === 2 ? "bg-orange-600" :
                          "bg-gray-300"
                        }`}>
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.totalQuantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        ${(Number(item.totalRevenue) / 100).toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暫無銷售數據
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
