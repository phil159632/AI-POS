// ==================================================
// 檔案 1/2: src/server/_core/llm.ts (最終版)
// ==================================================

import { ENV } from "./env";

const apiKey = ENV.forgeApiKey; // 從 env.ts 讀取
if (!apiKey) {
  throw new Error("環境變數 MANUS_API_KEY 尚未設定！");
}

const API_BASE_URL = 'https://api.manus.ai/v1';

/**
 * 提交一個新的 AI 任務
 * @returns 包含 task_id 的物件
 */
export async function submitLLMTask(prompt: string ): Promise<{ task_id: string }> {
  const url = `${API_BASE_URL}/tasks`;
  console.log(`[LLM] 正在提交任務到: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'API_KEY': apiKey,
    },
    body: JSON.stringify({ prompt,agentProfile:'manus-1.5-lite', mode: 'chat' }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`提交 LLM 任務失敗: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return await response.json();
}

/**
 * 根據 task_id 查詢任務結果
 * @param taskId 任務 ID
 * @returns 任務的詳細資訊，包含狀態和結果
 */
export async function getLLMTaskResult(taskId: string): Promise<any> {
  const url = `${API_BASE_URL}/tasks/${taskId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'API_KEY': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`查詢 LLM 任務結果失敗: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return await response.json();
}
