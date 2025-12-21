CREATE TABLE `favorite_meals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dishName` varchar(255) NOT NULL,
	`category` enum('japanese','western','chinese','other') NOT NULL,
	`note` text,
	`imageUrl` text,
	`usageCount` int DEFAULT 0,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `favorite_meals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pantry_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`ingredientName` varchar(255) NOT NULL,
	`quantity` varchar(50),
	`unit` varchar(20),
	`category` enum('vegetable','meat','fish','seasoning','other') NOT NULL,
	`expiryDate` varchar(10),
	`lowStockAlert` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pantry_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `meal_records` ADD `isFavorite` boolean DEFAULT false;