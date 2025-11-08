CREATE TABLE `dailyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`reportDate` timestamp NOT NULL,
	`totalOrders` int NOT NULL DEFAULT 0,
	`totalRevenue` int NOT NULL DEFAULT 0,
	`cashRevenue` int NOT NULL DEFAULT 0,
	`bankTransferRevenue` int NOT NULL DEFAULT 0,
	`creditCardRevenue` int NOT NULL DEFAULT 0,
	`dineInOrders` int NOT NULL DEFAULT 0,
	`takeoutOrders` int NOT NULL DEFAULT 0,
	`deliveryOrders` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menuCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`categoryName` varchar(50) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menuCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menuItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`categoryId` int NOT NULL,
	`itemName` varchar(100) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`imageUrl` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menuItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`itemName` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` int NOT NULL,
	`subtotal` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`tableId` int,
	`orderNumber` varchar(50) NOT NULL,
	`orderType` enum('dine_in','takeout','delivery') NOT NULL,
	`status` enum('pending','confirmed','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
	`subtotal` int NOT NULL,
	`taxAmount` int NOT NULL,
	`totalAmount` int NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','credit_card'),
	`paymentStatus` enum('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
	`paidAmount` int NOT NULL DEFAULT 0,
	`changeAmount` int NOT NULL DEFAULT 0,
	`staffId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `storeStaff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`userId` int NOT NULL,
	`staffRole` enum('owner','manager','staff') NOT NULL DEFAULT 'staff',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeStaff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeCode` varchar(20) NOT NULL,
	`storeName` varchar(100) NOT NULL,
	`ownerId` int NOT NULL,
	`address` text,
	`phone` varchar(20),
	`taxRate` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_storeCode_unique` UNIQUE(`storeCode`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`tableNumber` varchar(20) NOT NULL,
	`tableType` enum('dine_in','takeout','delivery') NOT NULL DEFAULT 'dine_in',
	`capacity` int NOT NULL DEFAULT 4,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tables_id` PRIMARY KEY(`id`)
);
