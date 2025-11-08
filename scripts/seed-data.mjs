import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function seedData() {
  console.log("開始建立測試資料...");

  try {
    const connection = await mysql.createConnection(DATABASE_URL);

    // 檢查是否已有店家
    const [stores] = await connection.query("SELECT COUNT(*) as count FROM stores");
    if (stores[0].count > 0) {
      console.log("資料庫已有店家資料,跳過種子資料建立");
      await connection.end();
      return;
    }

    console.log("建立測試店家...");
    const [storeResult] = await connection.query(
      "INSERT INTO stores (storeName, storeCode, ownerId, address, phone, taxRate) VALUES (?, ?, ?, ?, ?, ?)",
      ["測試餐廳", "TEST001", 1, "台北市信義區信義路五段7號", "02-1234-5678", 5]
    );
    const storeId = storeResult.insertId;
    console.log(`✓ 店家已建立 (ID: ${storeId})`);

    // 建立菜單分類
    console.log("建立菜單分類...");
    const categories = [
      { name: "開胃菜", order: 1 },
      { name: "主餐", order: 2 },
      { name: "飲品", order: 3 },
      { name: "甜點", order: 4 },
      { name: "酒類", order: 5 },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const [result] = await connection.query(
        "INSERT INTO menuCategories (storeId, categoryName, displayOrder, isActive) VALUES (?, ?, ?, ?)",
        [storeId, cat.name, cat.order, true]
      );
      categoryIds[cat.name] = result.insertId;
      console.log(`✓ 分類: ${cat.name}`);
    }

    // 建立菜單品項
    console.log("建立菜單品項...");
    const menuItems = [
      // 開胃菜
      { category: "開胃菜", name: "凱薩沙拉", price: 18000, desc: "新鮮生菜搭配凱薩醬" },
      { category: "開胃菜", name: "炸薯條", price: 12000, desc: "金黃酥脆薯條" },
      { category: "開胃菜", name: "雞翅", price: 15000, desc: "香烤雞翅6隻" },
      { category: "開胃菜", name: "洋蔥圈", price: 13000, desc: "酥炸洋蔥圈" },
      
      // 主餐
      { category: "主餐", name: "牛排套餐", price: 58000, desc: "8oz頂級牛排配時蔬" },
      { category: "主餐", name: "義大利麵", price: 28000, desc: "經典番茄肉醬義大利麵" },
      { category: "主餐", name: "烤雞腿排", price: 32000, desc: "香烤雞腿排配馬鈴薯泥" },
      { category: "主餐", name: "海鮮燉飯", price: 38000, desc: "新鮮海鮮燉飯" },
      { category: "主餐", name: "豬排飯", price: 25000, desc: "日式炸豬排飯" },
      { category: "主餐", name: "漢堡套餐", price: 22000, desc: "牛肉漢堡配薯條" },
      
      // 飲品
      { category: "飲品", name: "可樂", price: 5000, desc: "冰涼可樂" },
      { category: "飲品", name: "柳橙汁", price: 6000, desc: "新鮮柳橙汁" },
      { category: "飲品", name: "咖啡", price: 8000, desc: "美式咖啡" },
      { category: "飲品", name: "奶茶", price: 7000, desc: "香濃奶茶" },
      { category: "飲品", name: "檸檬水", price: 5000, desc: "清涼檸檬水" },
      
      // 甜點
      { category: "甜點", name: "提拉米蘇", price: 12000, desc: "經典義式甜點" },
      { category: "甜點", name: "巧克力蛋糕", price: 10000, desc: "濃郁巧克力蛋糕" },
      { category: "甜點", name: "冰淇淋", price: 8000, desc: "三球冰淇淋" },
      
      // 酒類
      { category: "酒類", name: "生啤酒", price: 15000, desc: "冰涼生啤酒" },
      { category: "酒類", name: "紅酒", price: 35000, desc: "精選紅酒" },
    ];

    for (const item of menuItems) {
      await connection.query(
        "INSERT INTO menuItems (storeId, categoryId, itemName, description, price, isAvailable, displayOrder) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [storeId, categoryIds[item.category], item.name, item.desc, item.price, true, 0]
      );
    }
    console.log(`✓ 已建立 ${menuItems.length} 個菜單品項`);

    // 建立桌位
    console.log("建立桌位...");
    const tables = [
      // 內用桌位
      ...Array.from({ length: 10 }, (_, i) => ({
        number: `A${i + 1}`,
        type: "dine_in",
        capacity: 4,
      })),
      // 外帶
      { number: "外帶01", type: "takeout", capacity: 1 },
      { number: "外帶02", type: "takeout", capacity: 1 },
      // 外送
      { number: "外送01", type: "delivery", capacity: 1 },
      { number: "外送02", type: "delivery", capacity: 1 },
    ];

    for (const table of tables) {
      await connection.query(
        "INSERT INTO tables (storeId, tableNumber, tableType, capacity, isActive) VALUES (?, ?, ?, ?, ?)",
        [storeId, table.number, table.type, table.capacity, true]
      );
    }
    console.log(`✓ 已建立 ${tables.length} 個桌位`);

    await connection.end();
    console.log("\n✅ 測試資料建立完成!");
    console.log("\n📝 測試店家資訊:");
    console.log("   店家名稱: 測試餐廳");
    console.log("   店家代號: TEST001");
    console.log("\n您可以使用此代號加入店家進行測試");
  } catch (error) {
    console.error("建立測試資料時發生錯誤:", error);
    process.exit(1);
  }
}

seedData();
