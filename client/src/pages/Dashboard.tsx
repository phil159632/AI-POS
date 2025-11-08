import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Store, 
  ShoppingCart, 
  FileText, 
  BarChart3, 
  Settings, 
  Brain,
  LogOut,
  ChevronRight,
  Building2,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { selectedStoreId, setSelectedStoreId } = useStore();

  const { data: myStores, isLoading: storesLoading } = trpc.store.myStores.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    if (myStores && myStores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(myStores[0].storeId);
    }
  }, [isAuthenticated, myStores, selectedStoreId, setLocation, setSelectedStoreId]);

  const handleLogout = () => {
    logout();
    toast.success("已登出");
    setLocation("/");
  };

  if (storesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!myStores || myStores.length === 0) {
    setLocation("/setup");
    return null;
  }

  const currentStore = myStores.find(s => s.storeId === selectedStoreId);
  const isOwner = currentStore?.staffRole === "owner";

  const menuItems = [
    {
      title: "點餐系統",
      description: "開始點餐與管理訂單",
      icon: ShoppingCart,
      path: "/pos",
      color: "bg-blue-500",
    },
    {
      title: "訂單查詢",
      description: "查看與管理所有訂單",
      icon: FileText,
      path: "/orders",
      color: "bg-green-500",
    },
    {
      title: "報表統計",
      description: "營業額與銷售分析",
      icon: BarChart3,
      path: "/reports",
      color: "bg-purple-500",
    },
    {
      title: "AI 智能查詢",
      description: "自然語言查詢店內數據",
      icon: Brain,
      path: "/ai-query",
      color: "bg-orange-500",
    },
  ];

  // 菜單與桌位編輯(所有人可見)
  menuItems.push(
    {
      title: "菜單編輯",
      description: "管理菜單分類與品項",
      icon: Settings,
      path: "/menu-editor",
      color: "bg-indigo-500",
    },
    {
      title: "桌位編輯",
      description: "管理內用桌位與編號",
      icon: Settings,
      path: "/table-editor",
      color: "bg-teal-500",
    },
    {
      title: "店家編輯",
      description: "設定店家資訊",
      icon: Building2,
      path: "/store-control",
      color: "bg-indigo-500",
    }
  );

  if (isOwner) {
    menuItems.push({
      title: "店家管理",
      description: "管理員工與店家設定",
      icon: Settings,
      path: "/store-management",
      color: "bg-gray-500",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI櫃台POS系統</h1>
              <p className="text-sm text-gray-500">{user?.name || user?.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/setup")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>

            <Select
              value={selectedStoreId?.toString() || ""}
              onValueChange={(value) => setSelectedStoreId(Number(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="選擇店家" />
              </SelectTrigger>
              <SelectContent>
                {myStores.map((store) => (
                  <SelectItem key={store.storeId} value={store.storeId.toString()}>
                    {store.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Store Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="w-5 h-5 mr-2 text-blue-600" />
              {currentStore?.storeName}
            </CardTitle>
            <CardDescription>
              店家代號: {currentStore?.storeCode} | 您的角色: {
                currentStore?.staffRole === "owner" ? "店長" :
                currentStore?.staffRole === "manager" ? "經理" : "店員"
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Menu Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Card
              key={item.path}
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => {
                localStorage.setItem("selectedStoreId", selectedStoreId?.toString() || "");
                setLocation(item.path);
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <CardTitle className="mt-4">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
