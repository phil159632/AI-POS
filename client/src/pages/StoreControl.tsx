// ==================================================
// 檔案：src/pages/StoreControl.tsx (最終修正版)
// ==================================================

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save } from "lucide-react";

// +++ 核心修正 1：為表單資料定義一個型別 +++
interface StoreFormData {
  storeName: string;
  storeCode: string;
  address: string;
  phone: string;
  taxRate: number | string; // 允許是字串，因為 input 的 value 預設是字串
}

export default function StoreControl() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // +++ 核心修正 2：為 useState 提供更精確的型別 <number | null> +++
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

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
    // +++ 核心修正 3：確保只有在 selectedStoreId 是 number 時才傳遞 input +++
    { storeId: selectedStoreId! }, 
    { 
      enabled: !!selectedStoreId,
    }
  );

  const [formData, setFormData] = useState<StoreFormData>({
    storeName: "",
    storeCode: "",
    address: "",
    phone: "",
    taxRate: 5,
  });

  useEffect(() => {
    if (storeData) {
      setFormData({
        storeName: storeData.storeName || "",
        storeCode: storeData.storeCode || "",
        address: storeData.address || "",
        phone: storeData.phone || "",
        taxRate: storeData.taxRate || 5,
      });
    }
  }, [storeData]);

  // +++ 核心修正 4：為事件參數 'e' 提供明確的型別 +++
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

  // +++ 核心修正 4：為事件參數 'e' 提供明確的型別 +++
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStoreId) return;

    updateStoreMutation.mutate({
      storeId: selectedStoreId,
      ...formData,
      taxRate: Number(formData.taxRate),
    });
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
              <CardTitle>編輯店家資訊</CardTitle>
              <CardDescription>
                更新後的資訊將會應用於所有相關功能中。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeName">店家名稱 *</Label>
                <Input
                  id="storeName"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleInputChange}
                  placeholder="例如：美味餐廳"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeCode">店家代號 * (3-20字元)</Label>
                <Input
                  id="storeCode"
                  name="storeCode"
                  value={formData.storeCode}
                  onChange={handleInputChange}
                  placeholder="例如：STORE001"
                  required
                  minLength={3}
                  maxLength={20}
                  disabled
                />
                <p className="text-xs text-gray-500">此代號將用於員工加入店家，建議不要修改。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="店家地址"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="聯絡電話"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">稅率 (%)</Label>
                <Input
                  id="taxRate"
                  name="taxRate"
                  type="number"
                  value={formData.taxRate}
                  onChange={handleInputChange}
                  placeholder="5"
                  min={0}
                  max={100}
                />
              </div>
              <Button type="submit" disabled={updateStoreMutation.isPending} className="w-full">
                {updateStoreMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                儲存變更
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
