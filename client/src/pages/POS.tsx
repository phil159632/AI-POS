import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Trash2, 
  Send,
  ShoppingCart
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderItem {
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  originalPrice: number; // 原始價格
  quantity: number;
  notes?: string;
}

export default function POS() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<"dine_in" | "takeout" | "delivery">("dine_in");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; itemIndex: number | null }>({
    open: false,
    itemIndex: null
  });
  const [tempNotes, setTempNotes] = useState("");
  const [priceDialog, setPriceDialog] = useState<{ open: boolean; itemIndex: number | null }>({
    open: false,
    itemIndex: null
  });
  const [tempPrice, setTempPrice] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    const storedStoreId = localStorage.getItem("selectedStoreId");
    if (storedStoreId) {
      setSelectedStoreId(Number(storedStoreId));
    }
    
    // 檢查是否在編輯訂單
    const editOrderId = localStorage.getItem("editOrderId");
    if (editOrderId) {
      setEditingOrderId(Number(editOrderId));
      localStorage.removeItem("editOrderId");
      localStorage.removeItem("editOrderStoreId");
    }
  }, [isAuthenticated, setLocation]);

  const { data: tables, isLoading: tablesLoading } = trpc.table.getAll.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const { data: categories } = trpc.menu.getCategories.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const { data: menuItems, isLoading: menuLoading } = trpc.menu.getItems.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  // 獲取編輯訂單的詳情
  const { data: editOrderDetail, isLoading: editOrderLoading } = trpc.order.getById.useQuery(
    { orderId: editingOrderId! },
    { enabled: !!editingOrderId }
  );

  // 當編輯訂單詳情加載時，填充表單
  useEffect(() => {
    if (editOrderDetail && editingOrderId) {
      // 設置訂單類型和桌位
      setOrderType(editOrderDetail.orderType);
      if (editOrderDetail.tableId) {
        setSelectedTable(editOrderDetail.tableId);
      }
      
      // 填充訂單品項
      const items = editOrderDetail.items?.map((item: any) => ({
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        originalPrice: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes,
      })) || [];
      setOrderItems(items);
      
      // 填充訂單備註
      setOrderNotes(editOrderDetail.notes || "");
    }
  }, [editOrderDetail, editingOrderId]);

  const createOrderMutation = trpc.order.create.useMutation({
    onSuccess: (data) => {
      toast.success(`訂單已送出! 訂單編號: ${data.orderNumber}`);
      setOrderItems([]);
      setOrderNotes("");
      setSelectedTable(null);
      setEditingOrderId(null);
    },
    onError: (error) => {
      toast.error(error.message || "送單失敗");
    },
  });

  const updateOrderMutation = trpc.order.update.useMutation({
    onSuccess: () => {
      toast.success("訂單已更新");
      setOrderItems([]);
      setOrderNotes("");
      setSelectedTable(null);
      setEditingOrderId(null);
      setLocation("/orders");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const addToOrder = (item: any) => {
    const existingIndex = orderItems.findIndex(oi => oi.menuItemId === item.id);
    if (existingIndex >= 0) {
      const newItems = [...orderItems];
      newItems[existingIndex].quantity += 1;
      setOrderItems(newItems);
    } else {
      setOrderItems([...orderItems, {
        menuItemId: item.id,
        itemName: item.itemName,
        unitPrice: item.price,
        originalPrice: item.price,
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...orderItems];
    newItems[index].quantity += delta;
    if (newItems[index].quantity <= 0) {
      newItems.splice(index, 1);
    }
    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const openNotesDialog = (index: number) => {
    setTempNotes(orderItems[index].notes || "");
    setNotesDialog({ open: true, itemIndex: index });
  };

  const saveNotes = () => {
    if (notesDialog.itemIndex !== null) {
      const newItems = [...orderItems];
      newItems[notesDialog.itemIndex].notes = tempNotes;
      setOrderItems(newItems);
    }
    setNotesDialog({ open: false, itemIndex: null });
    setTempNotes("");
  };

  const openPriceDialog = (index: number) => {
    setTempPrice(((orderItems[index].unitPrice / 100)).toString());
    setPriceDialog({ open: true, itemIndex: index });
  };

  const savePrice = () => {
    if (priceDialog.itemIndex !== null) {
      const newPrice = Math.round(parseFloat(tempPrice) * 100);
      if (isNaN(newPrice) || newPrice < 0) {
        toast.error("請輸入有效金額");
        return;
      }
      const newItems = [...orderItems];
      newItems[priceDialog.itemIndex].unitPrice = newPrice;
      setOrderItems(newItems);
      setPriceDialog({ open: false, itemIndex: null });
      setTempPrice("");
    }
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

   const handleSubmitOrder = () => {
    if (orderItems.length === 0) {
      toast.error("請至少選擇一個品項");
      return;
    }
    if (orderType === "dine_in" && !selectedTable) {
      toast.error("請選擇桌位");
      return;
    }
    if (editingOrderId) {
      // 編輯訂單模式：調用API更新訂單
      updateOrderMutation.mutate({
        orderId: editingOrderId,
        orderType,
        tableId: orderType === "dine_in" ? selectedTable! : null,
        notes: orderNotes,
        items: orderItems,
      });
    } else {
      // 新建訂單模式：提交訂單
      createOrderMutation.mutate({
        storeId: selectedStoreId!,
        tableId: orderType === "dine_in" ? selectedTable! : undefined,
        orderType,
        items: orderItems,
        notes: orderNotes,
      });
    }
  };;
 // 獲取店家資訊 (包含服務費) +++
 const { data: storeData, isLoading: storeLoading } = trpc.store.getById.useQuery(
  { storeId: selectedStoreId! },
  { enabled: !!selectedStoreId }
);
  if (storeLoading ||  tablesLoading || menuLoading || (editingOrderId && editOrderLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const taxRate = storeData?.taxRate ?? 5;
  const taxAmount = Math.round(subtotal * taxRate / 100);
  const total = subtotal + taxAmount;

  const dineInTables = tables?.filter(t => t.tableType === "dine_in") || [];
  const takeoutTables = tables?.filter(t => t.tableType === "takeout") || [];
  const deliveryTables = tables?.filter(t => t.tableType === "delivery") || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => {
              if (editingOrderId) {
                setLocation("/orders");
              } else {
                setLocation("/dashboard");
              }
            }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{editingOrderId ? "編輯訂單" : "點餐系統"}</h1>
              <p className="text-sm text-gray-500">{editingOrderId ? "修改訂單品項" : "選擇桌位與品項"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-140px)]">
          {/* 左側: 桌位選擇 */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">訂單類型</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={orderType === "dine_in" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setOrderType("dine_in")}
                >
                  內用
                </Button>
                <Button
                  variant={orderType === "takeout" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setOrderType("takeout")}
                >
                  外帶
                </Button>
                <Button
                  variant={orderType === "delivery" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setOrderType("delivery")}
                >
                  外送
                </Button>
              </CardContent>
            </Card>

            {orderType === "dine_in" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">桌位</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dineInTables.map((table) => (
                    <Button
                      key={table.id}
                      variant={selectedTable === table.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedTable(table.id)}
                    >
                      {table.tableNumber}
                    </Button>
                  ))}
                  {dineInTables.length === 0 && (
                    <p className="text-sm text-gray-500">暫無桌位</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 中間: 菜單 */}
          <div className="lg:col-span-6 overflow-y-auto">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>菜單</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={categories?.[0]?.id.toString() || "all"}>
                  <TabsList className="mb-4 flex-wrap h-auto">
                    {categories?.map((cat) => (
                      <TabsTrigger key={cat.id} value={cat.id.toString()}>
                        {cat.categoryName}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {categories?.map((cat) => (
                    <TabsContent key={cat.id} value={cat.id.toString()}>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {menuItems
                          ?.filter(item => item.categoryId === cat.id && item.isAvailable)
                          .map((item) => (
                            <Card
                              key={item.id}
                              className="cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => addToOrder(item)}
                            >
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-sm mb-1">{item.itemName}</h3>
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                  {item.description}
                                </p>
                                <p className="text-blue-600 font-bold">
                                  ${(item.price / 100).toFixed(0)}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 右側: 訂單明細 */}
          <div className="lg:col-span-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  訂單明細
                </CardTitle>
                {orderType === "dine_in" && selectedTable && (
                  <p className="text-sm text-gray-500">
                    桌號: {dineInTables.find(t => t.id === selectedTable)?.tableNumber}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {orderItems.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{item.itemName}</h4>
                            <p className="text-xs text-gray-500">${(item.unitPrice / 100).toFixed(0)}</p>
                            {item.notes && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.notes}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(index, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(index, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNotesDialog(index)}
                            >
                              備註
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPriceDialog(index)}
                            >
                              改價
                            </Button>
                            <span className="font-bold text-blue-600">
                              ${((item.unitPrice * item.quantity) / 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {orderItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      尚未選擇品項
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="orderNotes" className="text-sm">訂單備註</Label>
                    <Textarea
                      id="orderNotes"
                      placeholder="整單備註..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>小計</span>
                      <span>${(subtotal / 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>稅金 ({taxRate}%)</span>
                      <span>${(taxAmount / 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>總計</span>
                      <span className="text-blue-600">${(total / 100).toFixed(0)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmitOrder}
                    disabled={(createOrderMutation.isPending || updateOrderMutation.isPending) || orderItems.length === 0}
                  >
                    {(createOrderMutation.isPending || updateOrderMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {editingOrderId ? "更新" : "送單"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* 備註對話框 */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => !open && setNotesDialog({ open: false, itemIndex: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>品項備註</DialogTitle>
            <DialogDescription>
              為此品項添加特殊需求或備註
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="例: 不辣、加醬、不要蔥..."
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setNotesDialog({ open: false, itemIndex: null })}>
                取消
              </Button>
              <Button onClick={saveNotes}>
                確認
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 價格編輯對話框 */}
      <Dialog open={priceDialog.open} onOpenChange={(open) => !open && setPriceDialog({ open: false, itemIndex: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改品項價格</DialogTitle>
            <DialogDescription>
              調整此品項的單價(原價: ${priceDialog.itemIndex !== null ? ((orderItems[priceDialog.itemIndex].originalPrice / 100).toFixed(0)) : 0})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>新價格 (元)</Label>
              <Input
                type="number"
                placeholder="輸入新價格"
                value={tempPrice}
                onChange={(e) => setTempPrice(e.target.value)}
                min={0}
                step={1}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setPriceDialog({ open: false, itemIndex: null })}>
                取消
              </Button>
              <Button onClick={savePrice}>
                確認
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
