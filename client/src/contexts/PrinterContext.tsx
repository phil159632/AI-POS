// client/src/contexts/PrinterContext.tsx (最終完整版 + 斷線偵測)

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// 您印表機的 VID 和 PID
const PRINTER_FILTERS = [{ vendorId: 0x0fe6, productId: 0x811e }];

// 定義 Context 要提供的資料和函式的類型
interface PrinterContextType {
  isConnected: boolean;
  device: USBDevice | null;
  requestAndConnectDevice: () => Promise<void>;
  printOrder: (orderDetail: any, storeInfo: any, encoding: 'gbk' | 'big5' | 'sjis') => Promise<void>;
  testPrint: (encoding: 'gbk' | 'big5' | 'sjis') => Promise<void>;
}

// 建立 Context，並給一個預設值
const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

// 建立一個 Provider 元件，它將包裹我們的整個應用
export function PrinterProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const generateCommandMutation = trpc.printer.generatePrintCommand.useMutation();
  const testPrintMutation = trpc.printer.testPrintCommand.useMutation();

  // ===================================================================
  // 核心功能 1: 手動請求並連接新裝置
  // ===================================================================
  const requestAndConnectDevice = useCallback(async () => {
    try {
      const selectedDevice = await navigator.usb.requestDevice({ filters: PRINTER_FILTERS });
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
  }, []);

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
        encoding: encoding,
      };
      
      const result = await generateCommandMutation.mutateAsync(payload);
      const fullCommand = new Uint8Array(result.command);
      
      await device.transferOut(1, fullCommand); 
      toast.success("訂單已成功列印！");

    } catch (error: any) {
      console.error("列印流程失敗:", error);
      // 捕獲到斷線錯誤時，給予更明確的提示
      if (error instanceof DOMException && error.name === 'NetworkError') {
        toast.error("列印失敗：印表機已斷開連接。");
        // 主動重置狀態
        setIsConnected(false);
        setDevice(null);
      } else {
        toast.error(`列印失敗: ${error.message}`);
      }
    }
  }, [device, generateCommandMutation]);

  // ===================================================================
  // 核心功能 3: 測試列印
  // ===================================================================
  const testPrint = useCallback(async (encoding: 'gbk' | 'big5' | 'sjis') => {
    if (!device) {
      toast.error("請先連接印表機，再進行測試");
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
      toast.success(`${encoding.toUpperCase()} 測試指令已成功發送！`);

    } catch (error: any) {
      console.error("測試列印失敗:", error);
      if (error instanceof DOMException && error.name === 'NetworkError') {
        toast.error("測試失敗：印表機已斷開連接。");
        setIsConnected(false);
        setDevice(null);
      } else {
        toast.error(`測試列印失敗: ${error.message}`);
      }
    }
  }, [device, testPrintMutation]);


  // ===================================================================
  // 核心功能 4: 優雅退出 (確保下次能正常連接)
  // ===================================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (device) {
        console.log("[WebUSB] 頁面即將卸載，正在釋放印表機...");
        device.releaseInterface(0).catch(e => console.error("釋放介面失敗:", e));
        device.close().catch(e => console.error("關閉裝置失敗:", e));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [device]);

  // ===================================================================
  // 核心功能 5: 監聽 USB 連接與斷開事件 (新增！)
  // ===================================================================
  useEffect(() => {
    const handleDisconnect = (event: USBConnectionEvent) => {
      if (device && event.device.vendorId === device.vendorId && event.device.productId === device.productId) {
        console.log('[WebUSB] 已偵測到印表機斷開連接:', device.productName);
        toast.warning(`印表機 "${device.productName}" 已斷開連接。`);
        setIsConnected(false);
        setDevice(null);
      }
    };

    const handleConnect = (event: USBConnectionEvent) => {
      // 僅提示，不自動連接
      const isKnownPrinter = PRINTER_FILTERS.some(filter => 
        filter.vendorId === event.device.vendorId && filter.productId === event.device.productId
      );
      if (isKnownPrinter) {
        console.log('[WebUSB] 偵測到已知印表機插入:', event.device.productName);
        toast.info(`偵測到印表機 "${event.device.productName}"，您可以點擊按鈕進行連接。`);
      }
    };

    navigator.usb.addEventListener('disconnect', handleDisconnect);
    navigator.usb.addEventListener('connect', handleConnect);

    return () => {
      navigator.usb.removeEventListener('disconnect', handleDisconnect);
      navigator.usb.removeEventListener('connect', handleConnect);
    };
  }, [device]); // 依賴項是 device，確保我們總能訪問到最新的 device 物件

  // 將所有狀態和函式，透過 value 屬性提供給所有子元件
  const value = { isConnected, device, requestAndConnectDevice, printOrder, testPrint };

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
}

// 建立一個自定義 Hook，讓其他元件可以方便地使用這個 Context
export function usePrinter() {
  const context = useContext(PrinterContext);
  if (context === undefined) {
    throw new Error('usePrinter 必須在 PrinterProvider 內部使用');
  }
  return context;
}
