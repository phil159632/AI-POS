// client/src/contexts/PrinterContext.tsx (最終完整版 + 斷線偵測)

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
// +++ 新增：一個簡單、同步的行動裝置判斷工具 +++
const IS_MOBILE = (() => {
  // 確保只在客戶端環境執行
  if (typeof window === 'undefined') {
    return false;
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
})();
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

export function PrinterProvider({ children }: { children: ReactNode }) {
  // ===================================================================
  //  核心修改：在所有 Hooks 執行前，就用 IS_MOBILE 進行判斷
  // ===================================================================

  // 如果是行動裝置，直接提供一個「禁用版本」的 Context，且不執行任何 Hooks
  if (IS_MOBILE) {
    const mobileValue: PrinterContextType = {
      isConnected: false,
      device: null,
      requestAndConnectDevice: async () => {
        toast.error("此功能僅限桌面版瀏覽器使用。");
      },
      printOrder: async () => {
        console.warn("Print function is disabled on mobile devices.");
      },
      testPrint: async () => {
        toast.error("此功能僅限桌面版瀏覽器使用。");
      },
    };
    return (
      <PrinterContext.Provider value={mobileValue}>
        {children}
      </PrinterContext.Provider>
    );
  }

  // --- 只有在確定是桌面環境時，才執行以下所有 Hooks 和邏輯 ---
  
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const generateCommandMutation = trpc.printer.generatePrintCommand.useMutation();
  const testPrintMutation = trpc.printer.testPrintCommand.useMutation();

  // 核心功能 1: 手動請求並連接新裝置
  const requestAndConnectDevice = useCallback(async () => {
    // 這裡的 if 檢查可以保留，作為雙重保險
    if (!navigator.usb) {
      toast.error("您的瀏覽器不支援 WebUSB 功能。");
      return;
    }
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

  // 核心功能 2: 列印正式訂單 (保持不變)
  const printOrder = useCallback(async (
    orderDetail: any, 
    storeInfo: any,
    encoding: 'gbk' | 'big5' | 'sjis'
  ) => {
    // ... 您的列印邏輯 ...
  }, [device, generateCommandMutation]);

  // 核心功能 3: 測試列印 (保持不變)
  const testPrint = useCallback(async (encoding: 'gbk' | 'big5' | 'sjis') => {
    // ... 您的測試列印邏輯 ...
  }, [device, testPrintMutation]);

  // 核心功能 4: 優雅退出 (保持不變)
  useEffect(() => {
    // ... 您的 beforeunload 邏輯 ...
  }, [device]);

  // 核心功能 5: 監聽 USB 連接與斷開事件
  useEffect(() => {
    // 這裡的 if 檢查也可以保留
    if (!navigator.usb) {
      return;
    }
    const handleDisconnect = (event: USBConnectionEvent) => {
      if (device && event.device.productId === device.productId) {
        console.log("[WebUSB] 已連接的印表機被拔出！");
        setIsConnected(false);
        setDevice(null);
        toast.warning("印表機已斷開連接。");
      }
    };
    const handleConnect = async (event: USBConnectionEvent) => {
      console.log("[WebUSB] 偵測到新的 USB 裝置。", event.device);
      toast.info("偵測到新的 USB 裝置，您可以嘗試重新連接。");
    };
    navigator.usb.addEventListener('disconnect', handleDisconnect);
    navigator.usb.addEventListener('connect', handleConnect);
    return () => {
      navigator.usb.removeEventListener('disconnect', handleDisconnect);
      navigator.usb.removeEventListener('connect', handleConnect);
    };
  }, [device]);

  const desktopValue = { isConnected, device, requestAndConnectDevice, printOrder, testPrint };

  return (
    <PrinterContext.Provider value={desktopValue}>
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
