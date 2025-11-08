import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, ArrowLeft, Plus, Table as TableIcon, Edit2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

export default function TableEditor() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [tableDialog, setTableDialog] = useState(false);

  const [tableForm, setTableForm] = useState({
    tableNumber: "",
    tableType: "dine_in" as "dine_in" | "takeout" | "delivery",
    capacity: 4,
  });
  const [editingTable, setEditingTable] = useState<any>(null);
  const [deleteTableId, setDeleteTableId] = useState<number | null>(null);

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

  const { data: tables, refetch: refetchTables } = trpc.table.getAll.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const createTableMutation = trpc.table.create.useMutation({
    onSuccess: () => {
      toast.success("桌位已創建");
      refetchTables();
      setTableDialog(false);
      setTableForm({ tableNumber: "", tableType: "dine_in", capacity: 4 });
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const updateTableMutation = trpc.table.update.useMutation({
    onSuccess: () => {
      toast.success("桌位已更新");
      refetchTables();
      setEditingTable(null);
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteTableMutation = trpc.table.delete.useMutation({
    onSuccess: () => {
      toast.success("桌位已刪除");
      refetchTables();
      setDeleteTableId(null);
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const handleCreateTable = () => {
    if (!tableForm.tableNumber || !selectedStoreId) {
      toast.error("請填寫桌號");
      return;
    }
    createTableMutation.mutate({
      storeId: selectedStoreId,
      ...tableForm,
    });
  };

  const handleUpdateTable = () => {
    if (!editingTable.tableNumber) {
      toast.error("請填寫桌號");
      return;
    }
    updateTableMutation.mutate({
      tableId: editingTable.id,
      tableNumber: editingTable.tableNumber,
      tableType: editingTable.tableType,
      capacity: editingTable.capacity,
    });
  };

  const handleDeleteTable = () => {
    if (deleteTableId) {
      deleteTableMutation.mutate({ tableId: deleteTableId });
    }
  };

  const dineInTables = tables?.filter(t => t.tableType === "dine_in") || [];
  const takeoutTables = tables?.filter(t => t.tableType === "takeout") || [];
  const deliveryTables = tables?.filter(t => t.tableType === "delivery") || [];

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
                <TableIcon className="w-6 h-6 mr-2 text-blue-600" />
                桌位編輯
              </h1>
              <p className="text-sm text-gray-500">管理內用桌位與外帶外送編號</p>
            </div>
          </div>
          <Button onClick={() => setTableDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增桌位
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* 內用桌位 */}
        <Card>
          <CardHeader>
            <CardTitle>內用桌位</CardTitle>
            <CardDescription>管理餐廳內用桌號</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {dineInTables.map((table) => (
                <Card key={table.id} className="p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold">{table.tableNumber}</div>
                  <div className="text-sm text-gray-500">{table.capacity} 人座</div>
                  <Badge variant={table.isActive ? "default" : "secondary"} className="mt-2">
                    {table.isActive ? "啟用" : "停用"}
                  </Badge>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTable(table)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTableId(table.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
              {dineInTables.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  暫無內用桌位
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 外帶 */}
        <Card>
          <CardHeader>
            <CardTitle>外帶編號</CardTitle>
            <CardDescription>管理外帶訂單編號</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {takeoutTables.map((table) => (
                <Card key={table.id} className="p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold">{table.tableNumber}</div>
                  <Badge variant={table.isActive ? "default" : "secondary"} className="mt-2">
                    {table.isActive ? "啟用" : "停用"}
                  </Badge>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTable(table)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTableId(table.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
              {takeoutTables.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  暫無外帶編號
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 外送 */}
        <Card>
          <CardHeader>
            <CardTitle>外送編號</CardTitle>
            <CardDescription>管理外送訂單編號</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {deliveryTables.map((table) => (
                <Card key={table.id} className="p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-lg font-bold">{table.tableNumber}</div>
                  <Badge variant={table.isActive ? "default" : "secondary"} className="mt-2">
                    {table.isActive ? "啟用" : "停用"}
                  </Badge>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTable(table)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTableId(table.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>              ))}
              {deliveryTables.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  暫無外送編號
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 新增桌位對話框 */}
      <Dialog open={tableDialog} onOpenChange={setTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增桌位</DialogTitle>
            <DialogDescription>創建新的桌位或編號</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>桌號/編號 *</Label>
              <Input
                placeholder="例: A1, 外帶01"
                value={tableForm.tableNumber}
                onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>類型 *</Label>
              <Select
                value={tableForm.tableType}
                onValueChange={(v: any) => setTableForm({ ...tableForm, tableType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">內用</SelectItem>
                  <SelectItem value="takeout">外帶</SelectItem>
                  <SelectItem value="delivery">外送</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tableForm.tableType === "dine_in" && (
              <div className="space-y-2">
                <Label>座位數</Label>
                <Input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                  min={1}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setTableDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTable} disabled={createTableMutation.isPending}>
                {createTableMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                創建
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編輯桌位對話框 */}
      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯桌位</DialogTitle>
            <DialogDescription>修改桌位資訊</DialogDescription>
          </DialogHeader>
          {editingTable && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>桌號/編號 *</Label>
                <Input
                  placeholder="例: A1, 外帶01"
                  value={editingTable.tableNumber}
                  onChange={(e) => setEditingTable({ ...editingTable, tableNumber: e.target.value })}
                />
              </div>

              {editingTable.tableType === "dine_in" && (
                <div className="space-y-2">
                  <Label>容納人數</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingTable.capacity}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingTable(null)}>
                  取消
                </Button>
                <Button onClick={handleUpdateTable} disabled={updateTableMutation.isPending}>
                  {updateTableMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  更新
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 刪除桌位確認對話框 */}
      <AlertDialog open={deleteTableId !== null} onOpenChange={(open) => !open && setDeleteTableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除桌位</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將刪除該桌位。確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
