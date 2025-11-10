// src/server/_core/gemini.ts

// 根據您的最新範例，使用 @google/genai 的新語法
import { GoogleGenAI } from "@google/genai";
import { TRPCError } from "@trpc/server";

// 從環境變數讀取 Gemini API 金鑰
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("警告：伺服器端環境變數 GEMINI_API_KEY 尚未設定。");
}

// 初始化新的 GoogleGenAI 客戶端
// 它會自動從環境變數 GEMINI_API_KEY 讀取金鑰
const ai = new GoogleGenAI({});

/**
 * 向 Gemini API 發送請求並直接獲取結果。
 * (使用 @google/genai 的最新語法)
 * @param prompt - 要發送給 AI 的完整提示詞
 * @returns AI 生成的文字回答
 */
export async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '伺服器未設定 Gemini API 金鑰。'
    });
  }

  try {
    console.log("[Gemini SDK v2] 正在向 Gemini API 發送請求...");

    // 使用新的、更簡潔的 generateContent 方法
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite", // 您也可以根據需要換成 "gemini-1.5-flash" 等
      contents: [{
          role: "user",
          parts: [{ text: prompt }]
      }],
      // 安全設定的語法也可能更簡單，我們先暫時移除，如果需要再加回來.
    });
    
    // 直接從回應中獲取文字
    const answer = response.text;

    if (!answer) {
      console.error("[Gemini SDK v2] 無法從 API 回應中解析出答案:", response);
      throw new Error("AI 已處理完畢，但未能解析回答內容。");
    }

    console.log("[Gemini SDK v2] 成功獲取並解析出答案。");
    return answer;

  } catch (error) {
    console.error("[Gemini SDK v2] 與 Gemini API 互動時發生錯誤:", error);
    const errorMessage = error instanceof Error ? error.message : "與 AI 服務通訊時發生未知錯誤";
    throw new Error(errorMessage);
  }
}
