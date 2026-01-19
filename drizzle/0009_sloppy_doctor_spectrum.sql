CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resourceType` enum('article','sop') NOT NULL,
	`resourceId` int NOT NULL,
	`resourceSlug` varchar(500) NOT NULL,
	`resourceTitle` varchar(500) NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`assignedById` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
