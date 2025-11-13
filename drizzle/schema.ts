import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * 用戶表 - 核心認證表
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 店家表
 */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  storeCode: varchar("storeCode", { length: 20 }).notNull().unique(), // 店家代號
  storeName: varchar("storeName", { length: 100 }).notNull(),
  ownerId: int("ownerId").notNull(), // 店長用戶ID
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  taxRate: int("taxRate").default(5).notNull(), // 稅率(百分比)
   /* 是否預設開啟結帳後列印收據的功能
   */
  defaultPrintReceipt: boolean('default_print_receipt').default(false).notNull(),

  /**
   * 印表機的中文字元集編碼
   * 'gbk' - 適用於中國大陸銷售的型號
   * 'big5' - 適用於台灣/香港銷售的型號
   */
  printerEncoding: varchar('printer_encoding', { length: 10 }).default('gbk').notNull(),
  // -----------------
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/**
 * 店員表 - 用戶與店家的關聯
 */
export const storeStaff = mysqlTable("storeStaff", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  userId: int("userId").notNull(),
  staffRole: mysqlEnum("staffRole", ["owner", "manager", "staff"]).default("staff").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreStaff = typeof storeStaff.$inferSelect;
export type InsertStoreStaff = typeof storeStaff.$inferInsert;

/**
 * 菜單分類表
 */
export const menuCategories = mysqlTable("menuCategories", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  categoryName: varchar("categoryName", { length: 50 }).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;

/**
 * 菜單品項表
 */
export const menuItems = mysqlTable("menuItems", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  categoryId: int("categoryId").notNull(),
  itemName: varchar("itemName", { length: 100 }).notNull(),
  description: text("description"),
  price: int("price").notNull(), // 以分為單位儲存(避免浮點數問題)
  imageUrl: text("imageUrl"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

/**
 * 桌位表
 */
export const tables = mysqlTable("tables", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  tableNumber: varchar("tableNumber", { length: 20 }).notNull(),
  tableType: mysqlEnum("tableType", ["dine_in", "takeout", "delivery"]).default("dine_in").notNull(),
  capacity: int("capacity").default(4).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;

/**
 * 訂單表
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  tableId: int("tableId"), // 可為null(外帶/外送)
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  orderType: mysqlEnum("orderType", ["dine_in", "takeout", "delivery"]).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]).default("pending").notNull(),
  subtotal: int("subtotal").notNull(), // 小計(分)
  taxAmount: int("taxAmount").notNull(), // 稅金(分)
  totalAmount: int("totalAmount").notNull(), // 總額(分)
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank_transfer", "credit_card"]),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid", "refunded"]).default("unpaid").notNull(),
  paidAmount: int("paidAmount").default(0).notNull(), // 實付金額(分)
  changeAmount: int("changeAmount").default(0).notNull(), // 找零(分)
  staffId: int("staffId").notNull(), // 建單員工ID
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * 訂單品項表
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  menuItemId: int("menuItemId").notNull(),
  itemName: varchar("itemName", { length: 100 }).notNull(), // 冗餘儲存,避免菜單變動影響歷史訂單
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // 單價(分)
  subtotal: int("subtotal").notNull(), // 小計(分)
  notes: text("notes"), // 備註(不辣、加醬等)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * 日結報表表
 */
export const dailyReports = mysqlTable("dailyReports", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  reportDate: timestamp("reportDate").notNull(),
  totalOrders: int("totalOrders").default(0).notNull(),
  totalRevenue: int("totalRevenue").default(0).notNull(), // 總營業額(分)
  cashRevenue: int("cashRevenue").default(0).notNull(),
  bankTransferRevenue: int("bankTransferRevenue").default(0).notNull(),
  creditCardRevenue: int("creditCardRevenue").default(0).notNull(),
  dineInOrders: int("dineInOrders").default(0).notNull(),
  takeoutOrders: int("takeoutOrders").default(0).notNull(),
  deliveryOrders: int("deliveryOrders").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = typeof dailyReports.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  storeStaff: many(storeStaff),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  staff: many(storeStaff),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  tables: many(tables),
  orders: many(orders),
  dailyReports: many(dailyReports),
}));

export const storeStaffRelations = relations(storeStaff, ({ one }) => ({
  store: one(stores, {
    fields: [storeStaff.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [storeStaff.userId],
    references: [users.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  store: one(stores, {
    fields: [menuCategories.storeId],
    references: [stores.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  store: one(stores, {
    fields: [menuItems.storeId],
    references: [stores.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  store: one(stores, {
    fields: [tables.storeId],
    references: [stores.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const dailyReportsRelations = relations(dailyReports, ({ one }) => ({
  store: one(stores, {
    fields: [dailyReports.storeId],
    references: [stores.id],
  }),
}));
