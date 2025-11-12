import { WebSocketServer, WebSocket } from 'ws'; // +++ 核心修正：同時導入 WebSocket 型別 +++
import type { Server } from 'http';
import { URL } from 'url';
import * as db from './db';

// 現在 Map 中的 WebSocket 會被正確地識別為來自 'ws' 套件的型別
const printerClients = new Map<number, WebSocket>( );

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    if (!req.url) {
      console.error('[WebSocket] 錯誤：請求中沒有 URL。');
      ws.close(1008, 'URL is required');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}` );
    const storeIdStr = url.searchParams.get('storeId');
    const storeCode = url.searchParams.get('storeCode');

    console.log(`[WebSocket] 收到新的連線請求，原始 storeId: "${storeIdStr}", storeCode: "${storeCode}"`);

    const storeId = parseInt(storeIdStr || '', 10);
    if (isNaN(storeId)) {
      console.log(`[WebSocket] 驗證失敗：storeId "${storeIdStr}" 不是一個有效的數字。`);
      ws.close(1008, 'Invalid storeId format');
      return;
    }

    if (!storeCode) {
      console.log('[WebSocket] 驗證失敗：缺少 storeCode。');
      ws.close(1008, 'storeCode is required');
      return;
    }

    try {
      const store = await db.getStoreById(storeId);
      if (!store || store.storeCode !== storeCode) {
        console.log(`[WebSocket] 驗證失敗：店家不存在或代碼不匹配。查詢ID: ${storeId}, 傳入代碼: ${storeCode}, 資料庫代碼: ${store?.storeCode}`);
        ws.close(1008, 'Invalid store credentials');
        return;
      }

      console.log(`[WebSocket] 印表機客戶端已連線，店家: ${store.storeName} (ID: ${storeId})`);
      printerClients.set(storeId, ws);

      ws.on('close', () => {
        console.log(`[WebSocket] 店家 ${store.storeName} (ID: ${storeId}) 的印表機客戶端已離線。`);
        printerClients.delete(storeId);
      });

      ws.on('error', (error) => {
        console.error(`[WebSocket] 店家 ${store.storeName} (ID: ${storeId}) 的連線發生錯誤:`, error);
        printerClients.delete(storeId);
      });

    } catch (dbError) {
      console.error('[WebSocket] 資料庫查詢時發生錯誤:', dbError);
      ws.close(1011, 'Internal server error');
    }
  });

  console.log('✅ WebSocket 伺服器已準備就緒，等待印表機連線...');
}

export function sendPrintJob(storeId: number, orderData: any) {
  const client = printerClients.get(storeId);
  if (client && client.readyState === WebSocket.OPEN) {
    console.log(`[WebSocket] 正在向店家 ID: ${storeId} 發送列印任務...`);
    client.send(JSON.stringify({ type: 'PRINT_ORDER', payload: orderData }));
    return true;
  } else {
    console.warn(`[WebSocket] 無法發送列印任務：找不到店家 ID: ${storeId} 的連線，或連線未開啟。`);
    return false;
  }
}
