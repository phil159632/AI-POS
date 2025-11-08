// ==================================================
// 檔案 3/3: src/server/router.ts (修改後)
// ==================================================
import type { Order } from "../drizzle/schema";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { OAuth2Client } from 'google-auth-library';
import { TRPCError } from "@trpc/server";
// 引入我們自己的 session 工具
import { createSession, setSessionCookie, clearSessionCookie } from "./_core/session";

// +++ 核心修正 1：引入正確的函式 +++

// 引入新的 LLM 工具函式
import { submitLLMTask, getLLMTaskResult } from "./_core/llm"; 
// 初始化 Google Auth Client
const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.warn("警告：伺服器端環境變數 GOOGLE_CLIENT_ID 尚未設定。");
}
const googleClient = new OAuth2Client(googleClientId);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(async ({ ctx }) => {
      // 使用我們自己的工具來清除 cookie
      clearSessionCookie(ctx.req, ctx.res);
      return { success: true } as const;
    }),

    loginWithGoogle: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!googleClientId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '伺服器端未設定 GOOGLE_CLIENT_ID。' });
        }

        const ticket = await googleClient.verifyIdToken({
          idToken: input.token,
          audience: googleClientId,
        }).catch(err => {
          console.error("Google token 驗證失敗:", err);
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '無效的 Google 憑證。' });
        });
        
        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '無法從 Google 憑證中獲取必要的資訊。' });
        }

        const { sub: openId, email, name } = payload;

        // 使用您專案中既有的 upsertUser 函式
        await db.upsertUser({
          openId: openId,
          email: email,
          name: name || '新使用者',
          loginMethod: 'google',
          lastSignedIn: new Date(),
        });

        const user = await db.getUserByOpenId(openId);
        if (!user) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '登入失敗：無法在資料庫中找到或建立您的帳號。' });
        }

        // 使用我們自己的工具來建立 session 和設定 cookie
        const sessionToken = await createSession(user.id);
        setSessionCookie(ctx.req, ctx.res, sessionToken);

        return user;
      }),
  }),

  // --- 以下是您所有其他的 router，維持原樣 ---
  store: router({
    create: protectedProcedure
      .input(z.object({
        storeName: z.string().min(1),
        storeCode: z.string().min(3).max(20),
        address: z.string().optional(),
        phone: z.string().optional(),
        taxRate: z.number().min(0).max(100).default(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getStoreByCode(input.storeCode);
        if (existing) {
          throw new Error("店家代號已被使用");
        }
        const result = await db.createStore({
          ...input,
          ownerId: ctx.user.id,
        });
        const insertId = Number(result[0].insertId);
        await db.addStoreStaff({
          storeId: insertId,
          userId: ctx.user.id,
          staffRole: "owner",
        });
        return { success: true, storeId: insertId };
      }),
      updateStore: protectedProcedure // <--- 核心修正：將名稱從 update 改為 updateStore
      .input(z.object({
        storeId: z.number(),
        storeName: z.string().min(1).optional(),
        storeCode: z.string().min(3).max(20).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        taxRate: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storeId, ...updateData } = input;

        // 權限驗證
        const userStores = await db.getStoreStaffByUserId(ctx.user.id);
        const targetStore = userStores.find(s => s.storeId === storeId);

        if (!targetStore || (targetStore.staffRole !== 'owner' && targetStore.staffRole !== 'manager')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '您沒有權限修改此店家資訊。' });
        }

        // 執行資料庫更新
        await db.updateStore(storeId, updateData);
        
        return { success: true };
      }),
    joinByCode: protectedProcedure
      .input(z.object({
        storeCode: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const store = await db.getStoreByCode(input.storeCode);
        if (!store) {
          throw new Error("找不到該店家代號");
        }
        const existingStaff = await db.getStoreStaffByUserId(ctx.user.id);
        const alreadyMember = existingStaff.some(s => s.storeId === store.id);
        if (alreadyMember) {
          throw new Error("您已經是該店家的成員");
        }
        await db.addStoreStaff({
          storeId: store.id,
          userId: ctx.user.id,
          staffRole: "staff",
        });
        return { success: true, storeId: store.id };
      }),
    myStores: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStoreStaffByUserId(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStoreById(input.storeId);
      }),
    getStaff: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const userStores = await db.getStoreStaffByUserId(ctx.user.id);
        const hasAccess = userStores.some(s => s.storeId === input.storeId);
        if (!hasAccess) {
          throw new Error("無權限訪問該店家");
        }
        return await db.getStoreStaffByStoreId(input.storeId);
      }),
    updateStaff: protectedProcedure
      .input(z.object({
        staffId: z.number(),
        staffRole: z.enum(["owner", "manager", "staff"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { staffId, ...updateData } = input;
        await db.updateStoreStaff(staffId, updateData);
        return { success: true };
      }),
    deleteStaff: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteStoreStaff(input.staffId);
        return { success: true };
      }),
  }),
  menu: router({
    getCategories: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMenuCategoriesByStoreId(input.storeId);
      }),
    getItems: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMenuItemsByStoreId(input.storeId);
      }),
    createCategory: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        categoryName: z.string(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.createMenuCategory(input);
        return { success: true };
      }),
    createItem: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        categoryId: z.number(),
        itemName: z.string(),
        description: z.string().optional(),
        price: z.number(),
        displayOrder: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.createMenuItem(input);
        return { success: true };
      }),
    updateItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        itemName: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        isAvailable: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { itemId, ...updateData } = input;
        await db.updateMenuItem(itemId, updateData);
        return { success: true };
      }),
    deleteItem: protectedProcedure
      .input(z.object({
        itemId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteMenuItem(input.itemId);
        return { success: true };
      }),
    updateCategory: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        categoryName: z.string().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { categoryId, ...updateData } = input;
        await db.updateMenuCategory(categoryId, updateData);
        return { success: true };
      }),
    deleteCategory: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteMenuCategory(input.categoryId);
        return { success: true };
      }),
  }),
  table: router({
    getAll: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTablesByStoreId(input.storeId);
      }),
    create: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        tableNumber: z.string(),
        tableType: z.enum(["dine_in", "takeout", "delivery"]),
        capacity: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.createTable(input);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        tableId: z.number(),
        tableNumber: z.string().optional(),
        tableType: z.enum(["dine_in", "takeout", "delivery"]).optional(),
        capacity: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { tableId, ...updateData } = input;
        await db.updateTable(tableId, updateData);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({
        tableId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteTable(input.tableId);
        return { success: true };
      }),
    getByStore: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTablesByStoreId(input.storeId);
      }),
  }),
  order: router({
    create: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        tableId: z.number().optional(),
        orderType: z.enum(["dine_in", "takeout", "delivery"]),
        items: z.array(z.object({
          menuItemId: z.number(),
          itemName: z.string(),
          quantity: z.number().min(1),
          unitPrice: z.number(),
          notes: z.string().nullable().optional(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const store = await db.getStoreById(input.storeId);
        const taxRate = store?.taxRate || 5;
        const taxAmount = Math.round(subtotal * taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const orderResult = await db.createOrder({
          storeId: input.storeId,
          tableId: input.tableId,
          orderNumber,
          orderType: input.orderType,
          subtotal,
          taxAmount,
          totalAmount,
          staffId: ctx.user.id,
          notes: input.notes,
        });
        const orderId = Number(orderResult[0].insertId);
        const orderItems = input.items.map(item => ({
          orderId,
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
          notes: item.notes,
        }));
        await db.addOrderItems(orderItems);
        return { success: true, orderId, orderNumber };
      }),
      update: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        orderType: z.enum(["dine_in", "takeout", "delivery"]).optional(),
        tableId: z.number().optional().nullable(),
        notes: z.string().optional(),
        items: z.array(z.object({
          menuItemId: z.number(),
          itemName: z.string(),
          quantity: z.number().min(1),
          unitPrice: z.number(),
          // +++ 核心修正：使用正確的 .nullable().optional() 組合 +++
          notes: z.string().nullable().optional(), 
        })).optional(),
      }))
      // router.ts -> order.update -> mutation
.mutation(async ({ input }) => {
  // 1. 我們需要從 input 中解構出 items
  const { orderId, orderType, tableId, notes, items } = input;

  // 2. 我們需要刪除舊的品項
  if (items) {
    await db.deleteOrderItemsByOrderId(orderId);
  }

  // 3. 我們需要重新插入新的品項
  if (items && items.length > 0) {
    const newOrderItems = items.map(item => ({
      orderId: orderId,
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      notes: item.notes,
    }));
    await db.addOrderItems(newOrderItems);
  }

  // 4. 我們需要準備更新訂單主表的資料
  const updateData: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>> = {};
  if (orderType !== undefined) updateData.orderType = orderType;
  if (tableId !== undefined) updateData.tableId = tableId;
  if (notes !== undefined) updateData.notes = notes;

  // 5. 我們需要根據新的品項，重新計算總金額
  if (items) {
    const store = await db.getStoreById((await db.getOrderById(orderId))!.storeId);
    const taxRate = store?.taxRate || 5;
    
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.totalAmount = totalAmount;
  }
  
  // 6. 我們需要呼叫新增的 db.updateOrderDetails 函式來執行更新
  if (Object.keys(updateData).length > 0) {
    await db.updateOrderDetails(orderId, updateData);
  }
  
  // 7. 最後，我們才回傳 success
  return { success: true };
}),
    getById: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrderById(input.orderId);
      }),
    getAll: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userStores = await db.getStoreStaffByUserId(ctx.user.id);
        const hasAccess = userStores.some(s => s.storeId === input.storeId);
        if (!hasAccess) {
          throw new Error("無權限訪問該店家");
        }
        return await db.getOrdersByStoreId(input.storeId, {
          startDate: input.startDate,
          endDate: input.endDate,
        });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "completed", "cancelled"]),
        paymentMethod: z.enum(["cash", "bank_transfer", "credit_card"]).optional(),
        paymentStatus: z.enum(["pending", "paid", "refunded"]).optional(),
        paidAmount: z.number().optional(),
        changeAmount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { orderId, status, ...paymentData } = input;
        await db.updateOrderStatus(orderId, status, paymentData);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({
        orderId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.orderId, "cancelled");
        return { success: true };
      }),
  }),
  report: router({
    revenue: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const userStores = await db.getStoreStaffByUserId(ctx.user.id);
        const hasAccess = userStores.some(s => s.storeId === input.storeId);
        if (!hasAccess) {
          throw new Error("無權限訪問該店家");
        }
        return await db.getRevenueByTimeRange(input.storeId, input.startDate, input.endDate);
      }),
    topSelling: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ ctx, input }) => {
        const userStores = await db.getStoreStaffByUserId(ctx.user.id);
        const hasAccess = userStores.some(s => s.storeId === input.storeId);
        if (!hasAccess) {
          throw new Error("無權限訪問該店家");
        }
        return await db.getTopSellingItems(input.storeId, input.startDate, input.endDate, input.limit);
      }),
  }),
// AI查詢 (使用最終的輪詢和答案解析邏輯)
ai: router({
  query: protectedProcedure
    .input(z.object({
      storeId: z.number(),
      query: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userStores = await db.getStoreStaffByUserId(ctx.user.id);
      if (!userStores.some(s => s.storeId === input.storeId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '無權限訪問該店家' });
      }

      try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const [monthRevenue, topItems] = await Promise.all([
          db.getRevenueByTimeRange(input.storeId, startOfMonth, endOfMonth),
          db.getTopSellingItems(input.storeId, startOfMonth, endOfMonth, 10),
        ]);

        const fullPrompt = `
你是一個專業的餐飲業數據分析師。請根據以下提供的店家數據，用清晰、專業、友善的語氣回答使用者的問題。

[店家數據]
- 總營業額 (本月): $${Number(monthRevenue?.totalRevenue || 0).toFixed(0)}
- 總訂單數 (本月): ${monthRevenue?.totalOrders || 0} 筆
- 熱銷品項 (本月 TOP 10):
${topItems.map((item, i) => `  ${i + 1}. ${item.itemName}: 銷售 ${item.totalQuantity} 份`).join('\n')}

[使用者問題]
${input.query}

請根據以上資訊，提供清晰、專業的回答。
        `;

        // 1. 提交任務並獲取 task_id
        const { task_id } = await submitLLMTask(fullPrompt);
        if (!task_id) {
          throw new Error("提交 AI 任務後，未能獲取到 Task ID。");
        }
        console.log(`[AI Router] 成功提交任務，Task ID: ${task_id}`);

        // 2. 開始輪詢，查詢任務結果
        let taskResult;
        const maxRetries = 20;
        const retryInterval = 2000;

        for (let i = 0; i < maxRetries; i++) {
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          taskResult = await getLLMTaskResult(task_id);
          console.log(`[AI Router] 輪詢 #${i + 1}: 任務狀態為 "${taskResult.status}"`);
          if (taskResult.status === 'completed' || taskResult.status === 'failed') {
            break;
          }
        }

        // 3. 處理最終結果
        if (taskResult?.status === 'completed') {
          // 根據真實的 API 回應結構，精準地提取答案
          const assistantMessage = taskResult.output?.find(
            (item: any) => item.role === 'assistant'
          );
          const answer = assistantMessage?.content?.[0]?.text || "AI 已處理完畢，但未能解析回答內容。";
          
          console.log("[AI Router] 成功解析出最終答案:", answer);
          return { response: answer };
        } else if (taskResult?.status === 'failed') {
          throw new Error(`AI 任務處理失敗: ${taskResult.error_message || '未知錯誤'}`);
        } else {
          throw new Error("AI 任務處理超時，請稍後再試。");
        }

      } catch (error) {
        console.error("AI 查詢程序失敗:", error);
        const errorMessage = error instanceof Error ? error.message : "AI 查詢時發生未知錯誤";
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `AI 查詢失敗: ${errorMessage}`,
        });
      }
    }),
}),

});

export type AppRouter = typeof appRouter;
