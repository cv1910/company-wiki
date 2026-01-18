CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaveBalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`totalDays` int NOT NULL DEFAULT 30,
	`usedDays` int NOT NULL DEFAULT 0,
	`pendingDays` int NOT NULL DEFAULT 0,
	`carryOverDays` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveBalances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaveRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveType` enum('vacation','sick','personal','parental','other') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalDays` int NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approverId` int,
	`approverComment` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `leaveRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recentlyViewed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recentlyViewed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
	`sidebarCollapsed` boolean NOT NULL DEFAULT false,
	`keyboardShortcutsEnabled` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);
