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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Eye, CreditCard, DollarSign, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Orders() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedStoreId");
    return stored ? Number(stored) : null;
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "credit_card">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [userStores, setUserStores] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 獲取用戶持有的所有餐廳
  const { data: userStoresData } = trpc.store.myStores.useQuery();

  useEffect(() => {
    if (userStoresData && userStoresData.length > 0) {
      const storesWithDetails = userStoresData.map((staff: any) => ({
        id: staff.storeId,
        name: staff.storeName || 'Store ' + staff.storeId,
        code: staff.storeCode,
      }));
      setUserStores(storesWithDetails);
      
      // 如果selectedStoreId為null,設置為第一家店家
      if (!selectedStoreId && storesWithDetails.length > 0) {
        const firstStoreId = storesWithDetails[0].id;
        console.log('[Orders] Initializing selectedStoreId to:', firstStoreId);
        setSelectedStoreId(firstStoreId);
        localStorage.setItem("selectedStoreId", firstStoreId.toString());
      }
    }
  }, [userStoresData, selectedStoreId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);



  const { data: orders, isLoading, refetch } = trpc.order.getAll.useQuery(
    { 
      storeId: selectedStoreId!,
      startDate: new Date(startDate),
      endDate: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    },
    { enabled: !!selectedStoreId && selectedStoreId > 0 }
  );

  // 監聽selectedStoreId變化,自動重新查詢訂單
  useEffect(() => {
    if (selectedStoreId && selectedStoreId > 0) {
      console.log('[Orders] Refetching for storeId:', selectedStoreId);
      refetch();
    }
  }, [selectedStoreId, refetch]);

  const { data: orderDetail, isLoading: detailLoading } = trpc.order.getById.useQuery(
    { orderId: selectedOrder?.id! },
    { enabled: !!selectedOrder }
  );

  const updateStatusMutation = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("訂單狀態已更新");
      refetch();
      setCheckoutDialog(false);
      setSelectedOrder(null);
      setPaidAmount("");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const cancelOrderMutation = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("訂單已取消");
      refetch();
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error(error.message || "取消失敗");
    },
  });

  const handleCancelOrder = (order: any) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  const confirmCancelOrder = () => {
    if (orderToCancel) {
      cancelOrderMutation.mutate({
        orderId: orderToCancel.id,
        status: "cancelled",
      });
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  const handleCheckout = () => {
    if (!orderDetail) return;

    const paid = Math.round(parseFloat(paidAmount) * 100);
    const change = paid - orderDetail.totalAmount;

    if (paid < orderDetail.totalAmount) {
      toast.error("付款金額不足");
      return;
    }

    updateStatusMutation.mutate({
      orderId: orderDetail.id,
      status: "completed",
      paymentMethod,
      paymentStatus: "paid",
      paidAmount: paid,
      changeAmount: change,
    });
  };

  const handleEditOrder = (order: any) => {
    // 保存訂單ID到localStorage，點餐頁面可以讀取並加載
    localStorage.setItem("editOrderId", order.id.toString());
    localStorage.setItem("editOrderStoreId", selectedStoreId?.toString() || "");
    setLocation("/pos");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "待確認", variant: "secondary" },
      confirmed: { label: "已確認", variant: "default" },
      preparing: { label: "準備中", variant: "default" },
      ready: { label: "已完成", variant: "default" },
      completed: { label: "已結帳", variant: "outline" },
      cancelled: { label: "已取消", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      unpaid: { label: "未付款", variant: "secondary" },
      paid: { label: "已付款", variant: "default" },
      refunded: { label: "已退款", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">訂單查詢</h1>
              <p className="text-sm text-gray-500">查看與管理訂單</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>訂單查詢</CardTitle>
            <CardDescription>按日期區間查詢訂單</CardDescription>
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Label htmlFor="store-select">選擇餐廳</Label>
                <select
                  id="store-select"
                  value={selectedStoreId || ""}
                onChange={(e) => {
                  const storeId = Number(e.target.value);
                  if (storeId > 0) {
                    setSelectedStoreId(storeId);
                    localStorage.setItem("selectedStoreId", storeId.toString());
                  }
                }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mt-1"
                >
                  <option value="">-- 選擇餐廳 --</option>
                  {userStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Label htmlFor="start-date">開始日期</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">結束日期</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>訂單編號</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>桌號</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>付款狀態</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                      <TableCell>
                        {order.orderType === "dine_in" ? "內用" : 
                         order.orderType === "takeout" ? "外帶" : "外送"}
                      </TableCell>
                      <TableCell>{order.tableNumber || "-"}</TableCell>
                      <TableCell className="font-semibold">${(order.totalAmount / 100).toFixed(0)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString("zh-TW", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Button>
                          {order.paymentStatus === "unpaid" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                編輯
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowDetailDialog(false);
                                  setCheckoutDialog(true);
                                  setPaidAmount(((order.totalAmount / 100)).toString());
                                }}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                結帳
                              </Button>
                            </>
                          )}
                          {order.status !== "completed" && order.status !== "cancelled" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelOrder(order)}
                            >
                              取消
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                今日暫無訂單
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 訂單詳情對話框 - 支援滾動 */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDetailDialog(false);
          setSelectedOrder(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>訂單詳情</DialogTitle>
            <DialogDescription>
              訂單編號: {orderDetail?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : orderDetail ? (
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">訂單類型:</span>
                    <span className="ml-2 font-medium">
                      {orderDetail.orderType === "dine_in" ? "內用" : 
                       orderDetail.orderType === "takeout" ? "外帶" : "外送"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">狀態:</span>
                    <span className="ml-2">{getStatusBadge(orderDetail.status)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">付款方式:</span>
                    <span className="ml-2 font-medium">
                      {orderDetail.paymentMethod === "cash" ? "現金" :
                       orderDetail.paymentMethod === "bank_transfer" ? "銀行轉帳" :
                       orderDetail.paymentMethod === "credit_card" ? "信用卡" : "未付款"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">付款狀態:</span>
                    <span className="ml-2">{getPaymentBadge(orderDetail.paymentStatus)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">訂單品項</h3>
                  <div className="space-y-2">
                    {orderDetail.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-sm text-gray-500">
                            ${(item.unitPrice / 100).toFixed(0)} × {item.quantity}
                          </p>
                          {item.notes && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.notes}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-blue-600">
                          ${(item.subtotal / 100).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>小計</span>
                    <span>${(orderDetail.subtotal / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>稅金</span>
                    <span>${(orderDetail.taxAmount / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>總計</span>
                    <span className="text-blue-600">${(orderDetail.totalAmount / 100).toFixed(0)}</span>
                  </div>
                  {orderDetail.paymentStatus === "paid" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>實付金額</span>
                        <span>${(orderDetail.paidAmount / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>找零</span>
                        <span>${(orderDetail.changeAmount / 100).toFixed(0)}</span>
                      </div>
                    </>
                  )}
                </div>

                {orderDetail.notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500">訂單備註</p>
                    <p className="mt-1">{orderDetail.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* 結帳對話框 */}
      <Dialog open={checkoutDialog} onOpenChange={(open) => {
        if (!open) {
          setCheckoutDialog(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              結帳
            </DialogTitle>
            <DialogDescription>
              訂單編號: {orderDetail?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          {orderDetail && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">應付金額</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${(orderDetail.totalAmount / 100).toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>付款方式</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">現金</SelectItem>
                    <SelectItem value="bank_transfer">銀行轉帳</SelectItem>
                    <SelectItem value="credit_card">信用卡</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>實付金額</Label>
                <Input
                  type="number"
                  placeholder="輸入實付金額"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  min={0}
                  step={1}
                />
              </div>

              {paidAmount && parseFloat(paidAmount) >= (orderDetail.totalAmount / 100) && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-green-800">找零</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${(parseFloat(paidAmount) - (orderDetail.totalAmount / 100)).toFixed(0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setCheckoutDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCheckout} disabled={updateStatusMutation.isPending}>
                  {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  確認結帳
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 取消訂單確認對話框 */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認取消訂單</AlertDialogTitle>
            <AlertDialogDescription>
              確認要取消訂單 <span className="font-semibold text-gray-900">{orderToCancel?.orderNumber}</span> 嗎？此操作無法撤銷。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelOrder} className="bg-red-600 hover:bg-red-700">
              確認取消訂單
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
