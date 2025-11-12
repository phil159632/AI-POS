// server/main.ts (最終 Express 版本 + DB 預熱)

import 'dotenv/config';
import http from 'http';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './_core/context';
import { setupWebSocket } from './wsServer';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDb } from './db'; // +++ 核心改動：導入 getDb 函式 +++

// ------------------- 異步啟動函式 -------------------
async function startServer( ) {
  // +++ 核心改動：在所有服務啟動前，預熱資料庫連線 +++
  console.log('[Server] Initializing database connection...');
  const db = await getDb();
  if (!db) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('[Server] CRITICAL: Failed to initialize database connection. Server cannot start.');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    process.exit(1); // 如果資料庫連線失敗，直接退出程序
  }
  console.log('[Server] Database connection initialized successfully.');
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++

  const app = express();

  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  } ));
  app.use(cookieParser());

  app.use(
    '/api/trpc', // <-- 修正：確保 tRPC 掛載在 /api/trpc
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const server = http.createServer(app );
  setupWebSocket(server);

  const port = 4000;
  server.listen(port, () => {
    console.log(`🚀 Express, tRPC 和 WebSocket 後端伺服器已啟動於 http://localhost:${port}` );
  });
}
// ----------------------------------------------------

// 執行異步啟動函式
startServer();
