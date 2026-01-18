CREATE TABLE `articleReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`requestedById` int NOT NULL,
	`reviewerId` int,
	`status` enum('pending','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
	`requestMessage` text,
	`reviewMessage` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `articleReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userEmail` varchar(320),
	`userName` varchar(255),
	`action` varchar(64) NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` int,
	`resourceTitle` varchar(500),
	`oldValue` json,
	`newValue` json,
	`ipAddress` varchar(64),
	`userAgent` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `status` enum('draft','pending_review','published','archived') NOT NULL DEFAULT 'draft';