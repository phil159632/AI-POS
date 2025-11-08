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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, UserCog, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

export default function StoreManagement() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [deleteStaffId, setDeleteStaffId] = useState<number | null>(null);

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

  const { data: staff, isLoading, refetch } = trpc.store.getStaff.useQuery(
    { storeId: selectedStoreId! },
    { enabled: !!selectedStoreId }
  );

  const updateStaffMutation = trpc.store.updateStaff.useMutation({
    onSuccess: () => {
      toast.success("員工角色已更新");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteStaffMutation = trpc.store.deleteStaff.useMutation({
    onSuccess: () => {
      toast.success("員工已移除");
      refetch();
      setDeleteStaffId(null);
    },
    onError: (error) => {
      toast.error(error.message || "移除失敗");
    },
  });

  const handleRoleChange = (staffId: number, newRole: string) => {
    updateStaffMutation.mutate({
      staffId,
      staffRole: newRole as "owner" | "manager" | "staff",
    });
  };

  const handleDeleteStaff = () => {
    if (deleteStaffId) {
      deleteStaffMutation.mutate({ staffId: deleteStaffId });
    }
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
              <h1 className="text-2xl font-bold text-gray-900">店家管理</h1>
              <p className="text-sm text-gray-500">管理員工與權限</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCog className="w-5 h-5 mr-2 text-blue-600" />
              員工管理
            </CardTitle>
            <CardDescription>
              管理店內員工的角色與權限
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staff && staff.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.userName || "未設定"}</TableCell>
                      <TableCell>{member.userEmail || "未設定"}</TableCell>
                      <TableCell>
                        <Select
                          value={member.staffRole}
                          onValueChange={(value) => handleRoleChange(member.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">店長</SelectItem>
                            <SelectItem value="manager">經理</SelectItem>
                            <SelectItem value="staff">店員</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          member.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {member.isActive ? "啟用" : "停用"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteStaffId(member.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暫無員工資料
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={deleteStaffId !== null} onOpenChange={(open) => !open && setDeleteStaffId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認移除員工</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將移除該員工的店家存取權限,確定要繼續嗎?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff}>
              確認移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
