import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Plus, Edit, Trash2, UtensilsCrossed } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MenuEditor() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [categoryForm, setCategoryForm] = useState({ categoryName: "", displayOrder: 0 });
  const [itemForm, setItemForm] = useState({
    categoryId: 0,
    itemName: "",
    description: "",
    price: 0,
    isAvailable: true,
    displayOrder: 0,
  });

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

  const { data: categories, refetch: refetchCategories } = trpc.menu.getCategories.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const { data: menuItems, refetch: refetchItems } = trpc.menu.getItems.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const createCategoryMutation = trpc.menu.createCategory.useMutation({
    onSuccess: () => {
      toast.success("分類已創建");
      refetchCategories();
      setCategoryDialog(false);
      setCategoryForm({ categoryName: "", displayOrder: 0 });
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const createItemMutation = trpc.menu.createItem.useMutation({
    onSuccess: () => {
      toast.success("品項已創建");
      refetchItems();
      setItemDialog(false);
      resetItemForm();
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const updateItemMutation = trpc.menu.updateItem.useMutation({
    onSuccess: () => {
      toast.success("品項已更新");
      refetchItems();
      setItemDialog(false);
      resetItemForm();
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const resetItemForm = () => {
    setItemForm({
      categoryId: 0,
      itemName: "",
      description: "",
      price: 0,
      isAvailable: true,
      displayOrder: 0,
    });
    setEditingItem(null);
  };

  const handleCreateCategory = () => {
    if (!categoryForm.categoryName || !selectedStoreId) {
      toast.error("請填寫分類名稱");
      return;
    }
    createCategoryMutation.mutate({
      storeId: selectedStoreId,
      ...categoryForm,
    });
  };

  const handleSaveItem = () => {
    if (!itemForm.itemName || !itemForm.categoryId || !selectedStoreId) {
      toast.error("請填寫必填欄位");
      return;
    }

    if (editingItem) {
      updateItemMutation.mutate({
        itemId: editingItem.id,
        itemName: itemForm.itemName,
        description: itemForm.description,
        price: Math.round(itemForm.price * 100),
        isAvailable: itemForm.isAvailable,
        displayOrder: itemForm.displayOrder,
      });
    } else {
      createItemMutation.mutate({
        storeId: selectedStoreId,
        categoryId: itemForm.categoryId,
        itemName: itemForm.itemName,
        description: itemForm.description,
        price: Math.round(itemForm.price * 100),
        displayOrder: itemForm.displayOrder,
      });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      categoryId: item.categoryId,
      itemName: item.itemName,
      description: item.description || "",
      price: item.price / 100,
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder,
    });
    setItemDialog(true);
  };

  const handleToggleAvailable = (itemId: number, isAvailable: boolean) => {
    updateItemMutation.mutate({
      itemId,
      isAvailable: !isAvailable,
    });
  };

  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const deleteItemMutation = trpc.menu.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("菜單項目已刪除");
      refetchItems();
      setDeleteItemId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const deleteCategoryMutation = trpc.menu.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("分類已刪除");
      refetchCategories();
      refetchItems();
      setDeleteCategoryId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const handleDeleteItem = (itemId: number) => {
    setDeleteItemId(itemId);
  };

  const handleConfirmDeleteItem = () => {
    if (deleteItemId) {
      deleteItemMutation.mutate({ itemId: deleteItemId });
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    setDeleteCategoryId(categoryId);
  };

  const handleConfirmDeleteCategory = () => {
    if (deleteCategoryId) {
      deleteCategoryMutation.mutate({ categoryId: deleteCategoryId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <UtensilsCrossed className="w-6 h-6 mr-2 text-blue-600" />
                菜單編輯
              </h1>
              <p className="text-sm text-gray-500">管理菜單分類與品項</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* 分類管理 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>菜單分類</CardTitle>
                <CardDescription>管理菜單的分類標籤</CardDescription>
              </div>
              <Button onClick={() => setCategoryDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新增分類
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories?.map((cat) => (
                <Card key={cat.id} className="p-3">
                  <div className="font-semibold">{cat.categoryName}</div>
                  <div className="text-xs text-gray-500">排序: {cat.displayOrder}</div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryForm({
                          categoryName: cat.categoryName,
                          displayOrder: cat.displayOrder,
                        });
                        setCategoryDialog(true);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 品項管理 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>菜單品項</CardTitle>
                <CardDescription>管理所有菜單品項</CardDescription>
              </div>
              <Button onClick={() => {
                resetItemForm();
                setItemDialog(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                新增品項
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {menuItems && menuItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>品項名稱</TableHead>
                    <TableHead>分類</TableHead>
                    <TableHead>價格</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        ${(item.price / 100).toFixed(0)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-500">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => handleToggleAvailable(item.id, item.isAvailable)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暫無菜單品項
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 新增分類對話框 */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增分類</DialogTitle>
            <DialogDescription>創建新的菜單分類</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>分類名稱 *</Label>
              <Input
                placeholder="例: 開胃菜"
                value={categoryForm.categoryName}
                onChange={(e) => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>排序順序</Label>
              <Input
                type="number"
                value={categoryForm.displayOrder}
                onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCategoryDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                創建
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除品項確認對話框 */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除菜單項目</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將刪除該菜單項目。確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteItem}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 刪除分類確認對話框 */}
      <AlertDialog open={deleteCategoryId !== null} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除分類</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將刪除該分類及其下的所有菜單項目。確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCategory}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 新增/編輯品項對話框 */}
      <Dialog open={itemDialog} onOpenChange={(open) => {
        setItemDialog(open);
        if (!open) resetItemForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "編輯品項" : "新增品項"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "修改菜單品項資訊" : "創建新的菜單品項"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>品項名稱 *</Label>
                <Input
                  placeholder="例: 牛排套餐"
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>分類 *</Label>
                <Select
                  value={itemForm.categoryId.toString()}
                  onValueChange={(v) => setItemForm({ ...itemForm, categoryId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                placeholder="品項描述..."
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>價格 (元) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                  min={0}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>排序順序</Label>
                <Input
                  type="number"
                  value={itemForm.displayOrder}
                  onChange={(e) => setItemForm({ ...itemForm, displayOrder: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={itemForm.isAvailable}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, isAvailable: checked })}
              />
              <Label>品項可用</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => {
                setItemDialog(false);
                resetItemForm();
              }}>
                取消
              </Button>
              <Button
                onClick={handleSaveItem}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
              >
                {(createItemMutation.isPending || updateItemMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingItem ? "更新" : "創建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
