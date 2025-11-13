// server/_core/index.ts

import "dotenv/config";
import express from "express";
import { createServer, Server } from "http"; // 引入 Server 類型
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number ): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// --- 核心修改 1：將 server 變數提升到 startServer 函式外部 ---
let httpServer: Server | null = null;

async function startServer( ) {
  const app = express();
  // 將 createServer 的結果賦值給我們提升的變數
  httpServer = createServer(app ); 

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    // 將 httpServer 傳遞給 setupVite
    await setupVite(app, httpServer ); 
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // 使用 httpServer 來監聽
  httpServer.listen(port, ( ) => {
    console.log(`✅ Server running on http://localhost:${port}/` );
  });
}

// --- 核心修改 2：新增優雅關閉伺服器的邏輯 ---

const gracefulShutdown = (signal: string) => {
  console.log(`\n[${signal}] Received. Shutting down gracefully...`);
  
  // 檢查 httpServer 是否已初始化
  if (httpServer ) {
    httpServer.close(( ) => {
      console.log("✅ HTTP server closed. No new connections will be accepted.");
      
      // 在這裡可以加入其他的清理邏輯，例如關閉資料庫連接
      // await db.disconnect();
      // console.log("✅ Database connection closed.");

      console.log("Exiting process. Goodbye!");
      process.exit(0);
    });

    // 如果伺服器在 10 秒內沒有關閉，則強制退出
    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down.");
      process.exit(1);
    }, 10000);
  } else {
    // 如果伺服器還沒啟動就收到了關閉信號
    console.log("Server not started, exiting immediately.");
    process.exit(0);
  }
};

// 監聽 'Ctrl+C' 事件
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 監聽 'kill' 命令
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// --- 核心修改 3：啟動伺服器並處理潛在的啟動錯誤 ---
startServer().catch(error => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
