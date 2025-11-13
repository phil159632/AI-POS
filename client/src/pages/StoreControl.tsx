// src/pages/StoreControl.tsx (整合列印設定)

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePrinter } from "@/contexts/PrinterContext"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // +++ 引入 Switch
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // +++ 引入 Select
import { Loader2, ArrowLeft, Save, Printer } from "lucide-react";
// 擴展表單資料的型別
interface StoreFormData {
  storeName: string;
  storeCode: string;
  address: string;
  phone: string;
  taxRate: number | string;
  defaultPrintReceipt: boolean; // +++ 新增
  printerEncoding: 'gbk' | 'big5' | 'sjis'; // +++ 新增
}

export default function StoreControl() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  
  // +++ 初始化 usePrinter Hook
  const { isConnected, requestAndConnectDevice, device } = usePrinter();
  const testPrintMutation = trpc.printer.testPrintCommand.useMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    const storedStoreId = localStorage.getItem("selectedStoreId");
    if (storedStoreId) {
      setSelectedStoreId(Number(storedStoreId));
    } else {
      toast.error("尚未選擇店家，請返回儀表板選擇。");
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const { data: storeData, isLoading: isLoadingStore, error: storeError } = trpc.store.getById.useQuery(
    { storeId: selectedStoreId! }, 
    { enabled: !!selectedStoreId }
  );

  // 為 formData 設定更完整的初始狀態
  const [formData, setFormData] = useState<StoreFormData>({
    storeName: "",
    storeCode: "",
    address: "",
    phone: "",
    taxRate: 5,
    defaultPrintReceipt: false,
    printerEncoding: 'gbk',
  });

  useEffect(() => {
    if (storeData) {
      setFormData({
        storeName: storeData.storeName || "",
        storeCode: storeData.storeCode || "",
        address: storeData.address || "",
        phone: storeData.phone || "",
        taxRate: storeData.taxRate ?? 5,
        // @ts-ignore - Drizzle 返回的可能是 0/1，我們將其轉換為 boolean
        defaultPrintReceipt: Boolean(storeData.defaultPrintReceipt),
        // @ts-ignore - 確保 printerEncoding 有一個預設值
        printerEncoding: storeData.printerEncoding || 'gbk',
      });
    }
  }, [storeData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateStoreMutation = trpc.store.updateStore.useMutation({
    onSuccess: () => {
      toast.success("店家資訊已成功更新！");
      utils.store.getById.invalidate({ storeId: selectedStoreId! });
    },
    onError: (error) => {
      toast.error(`更新失敗: ${error.message}`);
    },
  });

  const utils = trpc.useUtils();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStoreId) return;

    updateStoreMutation.mutate({
      storeId: selectedStoreId,
      ...formData,
      taxRate: Number(formData.taxRate),
    });
  };

  // +++ 新增：處理測試列印的函式
  const handleTestPrint = async (encoding: 'gbk' | 'big5' | 'sjis') => {
    if (!isConnected || !device) {
      toast.info("請先連接印表機再進行測試。");
      // 嘗試連接，如果成功，用戶可以再次點擊測試
      await requestAndConnectDevice(); 
      return;
    }
    try {
      toast.info(`正在發送 [${encoding}] 編碼的測試頁...`);
      const result = await testPrintMutation.mutateAsync({ encoding });
      const command = new Uint8Array(result.command);
      await device.transferOut(1, command);
      toast.success("測試頁已發送！請檢查列印出的紙張。");
    } catch (error: any) {
      toast.error(`測試列印失敗: ${error.message}`);
    }
  };

  if (isLoadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        錯誤：無法加載店家資訊。 {storeError.message}
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
              <h1 className="text-2xl font-bold text-gray-900">店家資訊管理</h1>
              <p className="text-sm text-gray-500">編輯您目前的店家設定</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>基本資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ... 原有的店家名稱、代號、地址、電話、稅率欄位 ... */}
              <div className="space-y-2">
                <Label htmlFor="storeName">店家名稱 *</Label>
                <Input id="storeName" name="storeName" value={formData.storeName} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeCode">店家代號 *</Label>
                <Input id="storeCode" name="storeCode" value={formData.storeCode} onChange={handleInputChange} required disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">稅率 (%)</Label>
                <Input id="taxRate" name="taxRate" type="number" value={formData.taxRate} onChange={handleInputChange} />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>出單機列印設定</CardTitle>
              <CardDescription>
                設定結帳時的出單機行為與中文字元編碼。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="defaultPrintReceipt" className="text-base">
                    結帳後預設列印收據
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    開啟後，結帳時「列印收據」的開關將預設為開啟狀態。
                  </p>
                </div>
                <Switch
                  id="defaultPrintReceipt"
                  checked={formData.defaultPrintReceipt}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, defaultPrintReceipt: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="printerEncoding">中文字元編碼</Label>
                <Select
                  value={formData.printerEncoding}
                  onValueChange={(value: 'gbk' | 'big5' | 'sjis') => setFormData(p => ({ ...p, printerEncoding: value }))}
                >
                  <SelectTrigger id="printerEncoding">
                    <SelectValue placeholder="選擇編碼" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gbk">GBK (適用於多數中國大陸銷售的印表機)</SelectItem>
                    <SelectItem value="big5">Big5 (適用於台灣、香港銷售的印表機)</SelectItem>
                    <SelectItem value="sjis">Shift-JIS (適用於日本銷售的印表機)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  如果列印出的中文是亂碼，請嘗試切換此選項並進行測試。
                </p>
              </div>

              <div className="space-y-2">
                <Label>編碼測試</Label>
                <div className="p-4 border rounded-md bg-slate-50">
                  <p className="text-sm text-muted-foreground mb-4">
                    點擊下方按鈕，印表機將會印出一張測試頁。如果頁面上的中文「顯示正常」，則說明該編碼是正確的。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestPrint('gbk')}
                      disabled={testPrintMutation.isPending}
                      className="flex-1"
                    >
                      <Printer className="w-4 h-4 mr-2" /> 測試 GBK
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestPrint('big5')}
                      disabled={testPrintMutation.isPending}
                      className="flex-1"
                    >
                      <Printer className="w-4 h-4 mr-2" /> 測試 Big5
                    </Button>
                  </div>
                  {!isConnected && (
                     <p className="text-xs text-amber-600 mt-3">
                       提示：尚未連接印表機。點擊測試按鈕將會先引導您連接。
                     </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Button type="submit" disabled={updateStoreMutation.isPending} className="w-full">
              {updateStoreMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              儲存所有變更
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
