CREATE TABLE `contentVerification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedById` int,
	`verifiedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentVerification_id` PRIMARY KEY(`id`),
	CONSTRAINT `contentVerification_articleId_unique` UNIQUE(`articleId`)
);
--> statement-breakpoint
CREATE TABLE `pageViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`resourceType` enum('article','sop','category') NOT NULL,
	`resourceId` int NOT NULL,
	`resourceSlug` varchar(500),
	`resourceTitle` varchar(500),
	`sessionId` varchar(100),
	`referrer` varchar(500),
	`userAgent` text,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pageViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchQueries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`query` varchar(500) NOT NULL,
	`resultsCount` int NOT NULL DEFAULT 0,
	`clickedResourceType` enum('article','sop'),
	`clickedResourceId` int,
	`searchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchQueries_id` PRIMARY KEY(`id`)
);
