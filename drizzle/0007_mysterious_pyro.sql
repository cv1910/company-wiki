CREATE TABLE `emailQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`emailType` varchar(64) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`relatedType` varchar(64),
	`relatedId` int,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveRequestSubmitted` boolean NOT NULL DEFAULT true,
	`leaveRequestApproved` boolean NOT NULL DEFAULT true,
	`leaveRequestRejected` boolean NOT NULL DEFAULT true,
	`articleReviewRequested` boolean NOT NULL DEFAULT true,
	`articleApproved` boolean NOT NULL DEFAULT true,
	`articleRejected` boolean NOT NULL DEFAULT true,
	`articleFeedback` boolean NOT NULL DEFAULT true,
	`mentioned` boolean NOT NULL DEFAULT true,
	`dailyDigest` boolean NOT NULL DEFAULT false,
	`weeklyDigest` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mentionedUserId` int NOT NULL,
	`mentionedByUserId` int NOT NULL,
	`contextType` enum('article','comment','sop') NOT NULL,
	`contextId` int NOT NULL,
	`contextTitle` varchar(500),
	`isRead` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mentions_id` PRIMARY KEY(`id`)
);
