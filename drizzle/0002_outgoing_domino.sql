CREATE TABLE `articleFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` enum('helpful','not_helpful','needs_improvement') NOT NULL,
	`feedbackType` enum('content','accuracy','clarity','completeness','other') NOT NULL,
	`comment` text,
	`status` enum('pending','reviewed','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`adminResponse` text,
	`respondedById` int,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articleFeedback_id` PRIMARY KEY(`id`)
);
