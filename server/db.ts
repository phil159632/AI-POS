import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  stores, 
  storeStaff, 
  menuCategories, 
  menuItems, 
  tables, 
  orders, 
  orderItems,
  dailyReports,
  type Store,
  type StoreStaff,
  type MenuCategory,
  type MenuItem,
  type Table,
  type Order,
  type OrderItem,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== 用戶相關 =====
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== 店家相關 =====
export async function createStore(storeData: {
  storeName: string;
  storeCode: string;
  ownerId: number;
  address?: string;
  phone?: string;
  taxRate?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(stores).values(storeData);
  return result;
}

export async function getStoreByCode(storeCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(stores).where(eq(stores.storeCode, storeCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getStoreById(storeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
/**

* 更新店家資訊
 * @param storeId 店家 ID
 * @param data 要更新的資料
 */
export async function updateStore(storeId: number, data: Partial<Omit<Store, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(stores).set(data).where(eq(stores.id, storeId));
}

// ===== 店員相關 =====
export async function addStoreStaff(data: {
  storeId: number;
  userId: number;
  staffRole: "owner" | "manager" | "staff";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(storeStaff).values(data);
}

export async function getStoreStaffByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: storeStaff.id,
      storeId: storeStaff.storeId,
      userId: storeStaff.userId,
      staffRole: storeStaff.staffRole,
      isActive: storeStaff.isActive,
      storeName: stores.storeName,
      storeCode: stores.storeCode,
    })
    .from(storeStaff)
    .leftJoin(stores, eq(storeStaff.storeId, stores.id))
    .where(and(eq(storeStaff.userId, userId), eq(storeStaff.isActive, true)));
}

export async function getStoreStaffByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: storeStaff.id,
      storeId: storeStaff.storeId,
      userId: storeStaff.userId,
      staffRole: storeStaff.staffRole,
      isActive: storeStaff.isActive,
      userName: users.name,
      userEmail: users.email,
    })
    .from(storeStaff)
    .leftJoin(users, eq(storeStaff.userId, users.id))
    .where(eq(storeStaff.storeId, storeId));
}

export async function updateStoreStaff(staffId: number, data: { staffRole?: "owner" | "manager" | "staff"; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(storeStaff).set(data).where(eq(storeStaff.id, staffId));
}

export async function deleteStoreStaff(staffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(storeStaff).set({ isActive: false }).where(eq(storeStaff.id, staffId));
}

// ===== 菜單分類相關 =====
export async function getMenuCategoriesByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.storeId, storeId), eq(menuCategories.isActive, true)))
    .orderBy(menuCategories.displayOrder);
}

export async function createMenuCategory(data: {
  storeId: number;
  categoryName: string;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(menuCategories).values(data);
}

// ===== 菜單品項相關 =====
export async function getMenuItemsByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: menuItems.id,
      storeId: menuItems.storeId,
      categoryId: menuItems.categoryId,
      itemName: menuItems.itemName,
      description: menuItems.description,
      price: menuItems.price,
      imageUrl: menuItems.imageUrl,
      isAvailable: menuItems.isAvailable,
      displayOrder: menuItems.displayOrder,
      categoryName: menuCategories.categoryName,
    })
    .from(menuItems)
    .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(eq(menuItems.storeId, storeId))
    .orderBy(menuItems.displayOrder);
}

export async function createMenuItem(data: {
  storeId: number;
  categoryId: number;
  itemName: string;
  price: number;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(menuItems).values(data);
}

export async function updateMenuItem(itemId: number, data: Partial<MenuItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(menuItems).set(data).where(eq(menuItems.id, itemId));
}

// ===== 桌位相關 =====
export async function getTablesByStoreId(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(tables)
    .where(and(eq(tables.storeId, storeId), eq(tables.isActive, true)))
    .orderBy(tables.tableNumber);
}

export async function createTable(data: {
  storeId: number;
  tableNumber: string;
  tableType: "dine_in" | "takeout" | "delivery";
  capacity?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(tables).values(data);
}

// ===== 訂單相關 =====
export async function createOrder(orderData: {
  storeId: number;
  tableId?: number;
  orderNumber: string;
  orderType: "dine_in" | "takeout" | "delivery";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  staffId: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(orders).values(orderData);
  return result;
}

export async function addOrderItems(items: Array<{
  orderId: number;
  menuItemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string| null; 
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(orderItems).values(items);
}

export async function getOrdersByStoreId(storeId: number, filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const whereConditions: any[] = [eq(orders.storeId, storeId)];
  
  if (filters?.status) {
    whereConditions.push(eq(orders.status, filters.status as any));
  }
  if (filters?.startDate) {
    whereConditions.push(gte(orders.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    whereConditions.push(lte(orders.createdAt, filters.endDate));
  }

  const query = db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      totalAmount: orders.totalAmount,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      tableNumber: tables.tableNumber,
      createdAt: orders.createdAt,
      completedAt: orders.completedAt,
    })
    .from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .where(and(...whereConditions))
    .orderBy(desc(orders.createdAt));

  return await query;
}

export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const orderResult = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (orderResult.length === 0) return undefined;

  const order = orderResult[0];
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  return { ...order, items };
}

export async function updateOrderStatus(orderId: number, status: string, paymentData?: {
  paymentMethod?: string;
  paymentStatus?: string;
  paidAmount?: number;
  changeAmount?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (paymentData) {
    Object.assign(updateData, paymentData);
  }
  if (status === "completed") {
    updateData.completedAt = new Date();
  }

  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
}
/**
 * 根據訂單 ID 刪除該訂單的所有品項
 * @param orderId 訂單 ID
 */
export async function deleteOrderItemsByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
}

/**
 * 更新訂單的基本資訊 (總金額、備註、桌號等)
 * @param orderId 訂單 ID
 * @param updateData 要更新的資料
 */
export async function updateOrderDetails(orderId: number, updateData: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
}
// ===== 報表相關 =====
export async function getDailyReportByDate(storeId: number, reportDate: Date) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(dailyReports)
    .where(and(eq(dailyReports.storeId, storeId), eq(dailyReports.reportDate, reportDate)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getTopSellingItems(storeId: number, startDate: Date, endDate: Date, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      itemName: orderItems.itemName,
      totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
      totalRevenue: sql<number>`SUM(${orderItems.subtotal})`,
    })
    .from(orderItems)
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.paymentStatus, "paid")
      )
    )
    .groupBy(orderItems.itemName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(limit);
}

export async function getRevenueByTimeRange(storeId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      totalOrders: sql<number>`COUNT(*)`,
      totalRevenue: sql<number>`SUM(${orders.totalAmount})`,
      cashRevenue: sql<number>`SUM(CASE WHEN ${orders.paymentMethod} = 'cash' THEN ${orders.totalAmount} ELSE 0 END)`,
      bankTransferRevenue: sql<number>`SUM(CASE WHEN ${orders.paymentMethod} = 'bank_transfer' THEN ${orders.totalAmount} ELSE 0 END)`,
      creditCardRevenue: sql<number>`SUM(CASE WHEN ${orders.paymentMethod} = 'credit_card' THEN ${orders.totalAmount} ELSE 0 END)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, storeId),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(orders.paymentStatus, "paid")
      )
    );

  return result.length > 0 ? result[0] : null;
}

// 菜單管理 - 獲取分類(使用既有函數)
export async function getMenuCategories(storeId: number) {
  return await getMenuCategoriesByStoreId(storeId);
}

// 菜單管理 - 獲取品項含分類(使用既有函數)
export async function getMenuItemsWithCategory(storeId: number) {
  return await getMenuItemsByStoreId(storeId);
}

// 桌位管理 - 獲取所有桌位(使用既有函數)
export async function getAllTables(storeId: number) {
  return await getTablesByStoreId(storeId);
}


// ===== 菜單管理 - 編輯和刪除 =====
export async function deleteMenuItem(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(menuItems).where(eq(menuItems.id, itemId));
}

export async function updateMenuCategory(categoryId: number, data: Partial<MenuCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(menuCategories)
    .set(data)
    .where(eq(menuCategories.id, categoryId));
}

export async function deleteMenuCategory(categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 先刪除該分類下的所有品項
  await db.delete(menuItems).where(eq(menuItems.categoryId, categoryId));
  
  // 再刪除分類
  await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
}

// ===== 桌位管理 - 編輯和刪除 =====
export async function updateTable(tableId: number, data: Partial<Table>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tables)
    .set(data)
    .where(eq(tables.id, tableId));
}

export async function deleteTable(tableId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tables).where(eq(tables.id, tableId));
}
