import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Store, Plus, LogIn as LoginIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useStore } from "@/contexts/StoreContext";

export default function StoreSetup() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { setSelectedStoreId } = useStore();
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // 創建店家表單
  const [createForm, setCreateForm] = useState({
    storeName: "",
    storeCode: "",
    address: "",
    phone: "",
    taxRate: 5,
  });

  // 加入店家表單
  const [joinCode, setJoinCode] = useState("");

  const { data: myStores, isLoading: storesLoading, refetch: refetchStores } = trpc.store.myStores.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createStoreMutation = trpc.store.create.useMutation({
    onSuccess: (data) => {
      toast.success("店家創建成功!");
      if (data?.storeId) {
        setSelectedStoreId(data.storeId);
      }
      refetchStores();
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const joinStoreMutation = trpc.store.joinByCode.useMutation({
    onSuccess: (data) => {
      toast.success("成功加入店家!");
      if (data?.storeId) {
        setSelectedStoreId(data.storeId);
      }
      refetchStores();
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "加入失敗");
    },
  });

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.storeName || !createForm.storeCode) {
      toast.error("請填寫店家名稱和代號");
      return;
    }
    createStoreMutation.mutate(createForm);
  };

  const handleJoinStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) {
      toast.error("請輸入店家代號");
      return;
    }
    joinStoreMutation.mutate({ storeCode: joinCode });
  };

  if (loading || storesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
  }

  // 如果已有店家,顯示店家列表和選項卡
  if (myStores && myStores.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">我的店家</h1>
            <Button onClick={() => setLocation("/dashboard")}>
              前往控制台
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {myStores.map((store) => (
              <Card key={store.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedStoreId(store.storeId);
                  setLocation("/dashboard");
                }}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="w-5 h-5 mr-2 text-blue-600" />
                    {store.storeName}
                  </CardTitle>
                  <CardDescription>
                    代號: {store.storeCode} | 角色: {store.staffRole === "owner" ? "店長" : store.staffRole === "manager" ? "經理" : "店員"}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>新增店家</CardTitle>
              <CardDescription>創建新店家或加入現有店家</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "join")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">
                    <Plus className="w-4 h-4 mr-2" />
                    創建店家
                  </TabsTrigger>
                  <TabsTrigger value="join">
                    <LoginIcon className="w-4 h-4 mr-2" />
                    加入店家
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-4 mt-4">
                  <form onSubmit={handleCreateStore} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">店家名稱 *</Label>
                      <Input
                        id="storeName"
                        placeholder="例: 美味餐廳"
                        value={createForm.storeName}
                        onChange={(e) => setCreateForm({ ...createForm, storeName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="storeCode">店家代號 * (3-20字元)</Label>
                      <Input
                        id="storeCode"
                        placeholder="例: STORE001"
                        value={createForm.storeCode}
                        onChange={(e) => setCreateForm({ ...createForm, storeCode: e.target.value })}
                        minLength={3}
                        maxLength={20}
                        required
                      />
                      <p className="text-xs text-gray-500">此代號將用於員工加入店家</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">地址</Label>
                      <Input
                        id="address"
                        placeholder="店家地址"
                        value={createForm.address}
                        onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">電話</Label>
                      <Input
                        id="phone"
                        placeholder="聯絡電話"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxRate">稅率 (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        value={createForm.taxRate}
                        onChange={(e) => setCreateForm({ ...createForm, taxRate: Number(e.target.value) })}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={createStoreMutation.isPending}>
                      {createStoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      創建店家 (成為店長)
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="join" className="space-y-4 mt-4">
                  <form onSubmit={handleJoinStore} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="joinCode">店家代號</Label>
                      <Input
                        id="joinCode"
                        placeholder="輸入店家代號"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={joinStoreMutation.isPending}>
                      {joinStoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      加入店家
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 首次使用,顯示創建或加入選項
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">歡迎使用 AI櫃台POS系統</CardTitle>
          <CardDescription>請選擇創建新店家或加入現有店家</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "join")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                <Plus className="w-4 h-4 mr-2" />
                創建店家
              </TabsTrigger>
              <TabsTrigger value="join">
                <LoginIcon className="w-4 h-4 mr-2" />
                加入店家
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">店家名稱 *</Label>
                  <Input
                    id="storeName"
                    placeholder="例: 美味餐廳"
                    value={createForm.storeName}
                    onChange={(e) => setCreateForm({ ...createForm, storeName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeCode">店家代號 * (3-20字元)</Label>
                  <Input
                    id="storeCode"
                    placeholder="例: STORE001"
                    value={createForm.storeCode}
                    onChange={(e) => setCreateForm({ ...createForm, storeCode: e.target.value })}
                    minLength={3}
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-gray-500">此代號將用於員工加入店家</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">地址</Label>
                  <Input
                    id="address"
                    placeholder="店家地址"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">電話</Label>
                  <Input
                    id="phone"
                    placeholder="聯絡電話"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">稅率 (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.taxRate}
                    onChange={(e) => setCreateForm({ ...createForm, taxRate: Number(e.target.value) })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createStoreMutation.isPending}>
                  {createStoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  創建店家 (成為店長)
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <form onSubmit={handleJoinStore} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">店家代號</Label>
                  <Input
                    id="joinCode"
                    placeholder="輸入店家代號"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">請向店長索取店家代號</p>
                </div>

                <Button type="submit" className="w-full" disabled={joinStoreMutation.isPending}>
                  {joinStoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  加入店家 (成為店員)
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
