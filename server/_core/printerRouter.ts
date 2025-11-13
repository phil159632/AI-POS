// server/_core/printerRouter.ts (已升級)

import { z } from 'zod';
import { protectedProcedure, router } from './trpc'; 
import iconv from 'iconv-lite';

// --- 指令部分保持不變 ---
const ESC = 0x1b;
const GS = 0x1d;
const NUL = 0x00;
const COMMANDS = {
  INIT: Buffer.from([ESC, 0x40]),
  CUT: Buffer.from([GS, 0x56, 0x41, NUL]),
  LF: Buffer.from([0x0a]),
};
// 定義一個可重用的編碼類型
const encodingSchema = z.enum(['gbk', 'big5', 'sjis']);
export const printerRouter = router({
  /**
   * 舊的 generatePrintCommand 已被升級。
   * 現在它會接收一個 'encoding' 參數，來動態決定使用哪種編碼。
   */
  generatePrintCommand: protectedProcedure
    .input(
      z.object({
        // ... (保留所有現有的 input 欄位)
        storeName: z.string(),
        orderNumber: z.string(),
        createdAt: z.string(),
        items: z.array(z.object({
          itemName: z.string(),
          quantity: z.number(),
          subtotal: z.number(),
          notes: z.string().nullable().optional(),
        })),
        totalAmount: z.number(),
        paidAmount: z.number(),
        changeAmount: z.number(),
        
        // +++ 核心升級：新增 encoding 參數 +++
         encoding: encodingSchema, // 使用我們定義的編碼類型
      })
    )
    .mutation(({ input }) => {
      // 根據傳入的 encoding 參數，動態建立編碼函式
      const encodeText = (text: string) => iconv.encode(text, input.encoding);

      // --- 後續的邏輯與您現有的版本完全相同，只是將 toGbk 替換為 encodeText ---
      const parts: Buffer[] = [
        COMMANDS.INIT,
        encodeText(`          ${input.storeName}\n`),
        encodeText("--------------------------------\n"),
        encodeText(`訂單號: ${input.orderNumber}\n`),
        encodeText(`日期: ${new Date(input.createdAt).toLocaleString('zh-TW')}\n`),
        encodeText("--------------------------------\n"),
      ];
      input.items.forEach(item => {
        const name = item.itemName.padEnd(16, ' ');
        const quantity = `x${item.quantity}`.padStart(4, ' ');
        const price = `$${(item.subtotal / 100).toFixed(0)}`.padStart(8, ' ');
        parts.push(encodeText(`${name}${quantity}${price}\n`));
        if (item.notes) {
          parts.push(encodeText(`  - ${item.notes}\n`));
        }
      });
      parts.push(encodeText("--------------------------------\n"));
      parts.push(encodeText(`總計:`.padEnd(24, ' ') + `$${(input.totalAmount / 100).toFixed(0)}\n`));
      parts.push(encodeText(`實付:`.padEnd(24, ' ') + `$${(input.paidAmount / 100).toFixed(0)}\n`));
      parts.push(encodeText(`找零:`.padEnd(24, ' ') + `$${(input.changeAmount / 100).toFixed(0)}\n`));
      parts.push(COMMANDS.LF, COMMANDS.LF, COMMANDS.LF);
      parts.push(COMMANDS.CUT);
      
      const finalCommand = Buffer.concat(parts);
      return {
        command: Array.from(finalCommand),
      };
    }),

  /**
   * +++ 核心擴充：新增 generateTestPrintCommand 路由 +++
   * 這個新的 API 專門用於前端的「測試列印」按鈕。
   */
   // API 2: 生成測試列印指令 (這是您需要補上的部分)
  // ==================================================
  testPrintCommand: protectedProcedure
    .input(
      z.object({
        encoding: encodingSchema, // 同樣使用我們定義的編碼類型
      })
    )
    .mutation(({ input }) => {
      const encode = (text: string) => iconv.encode(text, input.encoding);

      const parts: Buffer[] = [
        COMMANDS.INIT,
        encode("--- 測試列印 ---\n"),
        encode(`編碼: ${input.encoding.toUpperCase()}\n`),
        encode("如果這行中文顯示正確，\n"),
        encode("請在設定中保存此編碼。\n"),
        encode("--------------------------------\n"),
        encode("English Test 123\n"),
        COMMANDS.LF,
        COMMANDS.LF,
        COMMANDS.CUT,
      ];

      const finalCommand = Buffer.concat(parts);
      return {
        command: Array.from(finalCommand),
      };
    }),
});
