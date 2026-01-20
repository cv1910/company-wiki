CREATE TABLE `ohweeeDeliveryReceipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ohweeeId` int NOT NULL,
	`userId` int NOT NULL,
	`deliveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohweeeDeliveryReceipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ohweeeTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`sourceOhweeeId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`completedById` int,
	`dueDate` timestamp,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`assigneeId` int,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ohweeeTasks_id` PRIMARY KEY(`id`)
);
