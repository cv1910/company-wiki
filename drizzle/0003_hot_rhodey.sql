CREATE TABLE `articleTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`icon` varchar(64),
	`isSystem` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdById` int,
	CONSTRAINT `articleTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `articleTemplates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(500) NOT NULL,
	`originalFilename` varchar(500) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`size` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`width` int,
	`height` int,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
