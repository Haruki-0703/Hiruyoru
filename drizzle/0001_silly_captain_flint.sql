CREATE TABLE `meal_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`mealType` enum('lunch','dinner') NOT NULL,
	`dishName` varchar(255) NOT NULL,
	`category` enum('japanese','western','chinese','other') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_records_id` PRIMARY KEY(`id`)
);
