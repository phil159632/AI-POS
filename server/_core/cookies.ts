// ==================================================
// 檔案：src/server/_core/cookies.ts (最終修正版)
// ==================================================

import type { CookieOptions, Request } from "express";
import { ONE_YEAR_MS } from "@shared/const";

/**
 * 判斷請求是否為安全連線 (HTTPS)
 * 考慮了直接的 HTTPS 和反向代理後的 x-forwarded-proto 標頭
 */
function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https" ) {
    return true;
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) {
    return false;
  }

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https" );
}

/**
 * 獲取用於設定 session cookie 的選項
 */
export function getSessionCookieOptions(req: Request): CookieOptions {
  const isSecure = isSecureRequest(req);

  return {
    httpOnly: true, // 保護 cookie 不被客戶端 JavaScript 讀取
    secure: isSecure, // 在生產環境 (HTTPS ) 中，這個會是 true
    
    // +++ 核心修正 +++
    // 將 sameSite 從 "none" 改為 "lax"。
    // "lax" 在大多數情況下都能正常運作，並且不需要 secure 屬性必須為 true，
    // 這使得它在 http://localhost 的開發環境中也能正常工作 。
    sameSite: "lax", 
    
    path: "/", // 讓 cookie 在整個網站都有效
    maxAge: ONE_YEAR_MS, // cookie 有效期一年
  };
}
