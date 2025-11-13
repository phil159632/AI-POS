// client/src/hooks/usePrinter.ts (最終完整版)

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// 您印表機的 VID 和 PID
const PRINTER_FILTERS = [{ vendorId: 0x0fe6, productId: 0x811e }];

export function usePrinter() {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // tRPC mutation，用於呼叫後端生成列印指令
  const generateCommandMutation = trpc.printer.generatePrintCommand.useMutation();
  const testPrintMutation = trpc.printer.testPrintCommand.useMutation(); // 新增：測試列印的 mutation

  // ===================================================================
  // 核心功能 1: 手動請求並連接新裝置
  // ===================================================================
  const requestAndConnectDevice = useCallback(async () => {
    try {
      // 這一行是關鍵，它必須由真實的用戶點擊直接觸發
 const selectedDevice = await navigator.usb.requestDevice({ filters: [] });      
      if (!selectedDevice) {
        toast.info("您已取消選擇印表機。");
        return;
      }
      
      toast.info(`正在連接到: ${selectedDevice.productName}...`);

      await selectedDevice.open();
      await selectedDevice.selectConfiguration(1);
      await selectedDevice.claimInterface(0); 
      
      setDevice(selectedDevice);
      setIsConnected(true);
      toast.success(`已成功連接到印表機！`);

    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        toast.info("您已取消選擇印表機。");
      } else {
        console.error("WebUSB 手動連接失敗:", error);
        toast.error(`連接印表機失敗: ${error.message}`);
      }
    }
  }, []); // 空依賴項，保證函式穩定

  // ===================================================================
  // 核心功能 2: 列印正式訂單
  // ===================================================================
  const printOrder = useCallback(async (
    orderDetail: any, 
    storeInfo: any,
    encoding: 'gbk' | 'big5' | 'sjis'
  ) => {
    if (!device) {
      toast.error("印表機未連接，無法列印");
      return;
    }
    if (generateCommandMutation.isPending) {
      toast.info("正在生成上一個列印指令...");
      return;
    }
    try {
      toast.info("正在從伺服器生成列印指令...");
      const payload = {
        storeName: storeInfo.name,
        orderNumber: orderDetail.orderNumber,
        createdAt: orderDetail.createdAt.toISOString(),
        items: orderDetail.items.map((item: any) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          subtotal: item.subtotal,
          notes: item.notes,
        })),
        totalAmount: orderDetail.totalAmount,
        paidAmount: orderDetail.paidAmount,
        changeAmount: orderDetail.changeAmount,
        encoding: encoding, // 將編碼傳遞給後端
      };
      
      const result = await generateCommandMutation.mutateAsync(payload);
      const fullCommand = new Uint8Array(result.command);
      
      await device.transferOut(1, fullCommand); 
      toast.success("訂單已成功列印！");

    } catch (error: any) {
      console.error("列印流程失敗:", error);
      toast.error(`列印失敗: ${error.message}`);
    }
  }, [device, generateCommandMutation]);

  // ===================================================================
  // 核心功能 3: 測試列印 (新增)
  // ===================================================================
  const testPrint = useCallback(async (encoding: 'gbk' | 'big5' | 'sjis') => {
    if (!device) {
      toast.error("請先連接印表機，再進行測試");
      // 主動觸發一次連接請求，引導使用者
      await requestAndConnectDevice(); 
      return;
    }
    if (testPrintMutation.isPending) {
      toast.info("正在生成上一個測試指令...");
      return;
    }
    try {
      toast.info(`正在測試 ${encoding.toUpperCase()} 編碼...`);
      
      const result = await testPrintMutation.mutateAsync({ encoding });
      const fullCommand = new Uint8Array(result.command);

      await device.transferOut(1, fullCommand);
      toast.success(`${encoding.toUpperCase()} 測試指令已發送！`);

    } catch (error: any) {
      console.error("測試列印失敗:", error);
      toast.error(`測試列印失敗: ${error.message}`);
    }
  }, [device, testPrintMutation, requestAndConnectDevice]);


  // ===================================================================
  // 核心功能 4: 優雅退出 (確保下次能正常連接)
  // ===================================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (device) {
        console.log("[WebUSB] 頁面即將卸載，正在釋放印表機...");
        // 盡力而為地釋放資源，忽略可能的錯誤
        device.releaseInterface(0).catch(e => console.error("釋放介面失敗:", e));
        device.close().catch(e => console.error("關閉裝置失敗:", e));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 在 Hook 被卸載時 (例如元件銷毀)，清理事件監聽器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [device]); // 依賴項是 device，確保我們總能訪問到最新的 device 物件

  // 返回所有需要給 UI 使用的函式和狀態
  return {
    isConnected,
    device,
    requestAndConnectDevice,
    printOrder,
    testPrint, // 新增：導出 testPrint 函式
  };
}
