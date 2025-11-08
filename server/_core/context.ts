// ==================================================
// 檔案：src/server/_core/context.ts (最終修正版)
// ==================================================

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";
import { verifySession } from "./session"; // 引入我們自己的 session 驗證工具

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * 建立 tRPC 上下文 (Context)
 * 這個函式會在每一個 API 請求進來時被呼叫
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. 從請求中解析 cookie
  const cookieHeader = opts.req.headers.cookie;
  const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
  const sessionToken = cookies[COOKIE_NAME];

  if (sessionToken) {
    // 2. 如果有 session token，使用我們自己的工具來驗證它
    const session = await verifySession(sessionToken);
    if (session?.userId) {
      // 3. 如果 session 有效，就用解密出來的 userId 去資料庫找使用者
      const foundUser = await db.getUserById(session.userId);
      
      // +++ 核心修正 +++
      // 將可能回傳的 undefined 轉換為 null，以符合 user 變數的型別
      user = foundUser || null;
    }
  }

  // 4. 將 user 物件 (如果存在) 和 req/res 物件放進 context，供 API 程序使用
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
