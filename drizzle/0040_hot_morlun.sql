CREATE TABLE `overtimeBalance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`targetHours` decimal(6,2) NOT NULL,
	`actualHours` decimal(6,2) NOT NULL,
	`overtimeHours` decimal(6,2) NOT NULL,
	`carryOverHours` decimal(6,2) NOT NULL DEFAULT '0',
	`status` enum('pending','approved','paid_out') NOT NULL DEFAULT 'pending',
	`approvedById` int,
	`approvedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `overtimeBalance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `targetWorkHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthlyHours` decimal(6,2) NOT NULL,
	`weeklyHours` decimal(5,2) NOT NULL,
	`employmentType` enum('full_time','part_time','mini_job','student','intern') NOT NULL DEFAULT 'full_time',
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdById` int NOT NULL,
	CONSTRAINT `targetWorkHours_id` PRIMARY KEY(`id`)
);
