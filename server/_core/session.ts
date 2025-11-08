// ==================================================
// 檔案 1/3: src/server/_core/session.ts (新檔案)
// ==================================================

import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";

// 從 .env 讀取我們的 session 密鑰
const secret = process.env.SESSION_SECRET;
if (!secret) {
  // 在伺服器啟動時拋出錯誤，強制開發者設定密鑰，這是一個好的實踐
  throw new Error("環境變數 SESSION_SECRET 尚未設定！請在 .env 檔案中新增一個隨機的長字串。");
}
const secretKey = new TextEncoder().encode(secret);

/**
 * 為指定的使用者 ID 建立一個 session JWT
 * @param userId 要為其建立 session 的使用者 ID
 * @returns 加密後的 session token (JWT)
 */
export async function createSession(userId: number): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS; // session 有效期一年
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  return new SignJWT({ userId }) // payload 中只包含 userId
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .setIssuedAt(issuedAt / 1000)
    .sign(secretKey);
}

/**
 * 驗證傳入的 session JWT
 * @param token 從 cookie 中讀取到的 session token
 * @returns 如果驗證成功，回傳包含 userId 的物件；否則回傳 null
 */
export async function verifySession(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    const { userId } = payload as { userId?: number };

    // 確保 payload 中確實有 number 型別的 userId
    if (typeof userId !== 'number') {
      console.warn("[Auth] Session payload 格式不正確，缺少 userId。");
      return null;
    }
    return { userId };
  } catch (error) {
    // 這通常發生在 token 過期、被竄改或密鑰不匹配時
    console.warn("[Auth] 自訂 Session 驗證失敗:", String(error));
    return null;
  }
}

/**
 * 將 session token 設定到瀏覽器的 httpOnly cookie 中
 * @param req Express 請求物件
 * @param res Express 回應物件
 * @param sessionToken 要設定的 session token
 */
export function setSessionCookie(req: Request, res: Response, sessionToken: string ) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
}

/**
 * 清除瀏覽器的 session cookie
 * @param req Express 請求物件
 * @param res Express 回應物件
 */
export function clearSessionCookie(req: Request, res: Response) {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
}
