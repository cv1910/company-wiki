CREATE TABLE `calendarEventSyncMap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`localEventId` int,
	`googleEventId` varchar(255) NOT NULL,
	`googleCalendarId` varchar(255) NOT NULL,
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`syncDirection` enum('import','export','both') DEFAULT 'both',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarEventSyncMap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `googleCalendarConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`googleEmail` varchar(320),
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`tokenExpiresAt` timestamp NOT NULL,
	`calendarId` varchar(255) DEFAULT 'primary',
	`syncEnabled` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`lastSyncStatus` enum('success','error','pending') DEFAULT 'pending',
	`lastSyncError` text,
	`syncToken` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googleCalendarConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `googleCalendarConnections_userId_unique` UNIQUE(`userId`)
);
