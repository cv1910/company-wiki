CREATE TABLE `eventBookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventTypeId` int NOT NULL,
	`hostId` int NOT NULL,
	`guestUserId` int,
	`guestName` varchar(255) NOT NULL,
	`guestEmail` varchar(320) NOT NULL,
	`guestNotes` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
	`meetingLink` text,
	`googleEventId` varchar(255),
	`cancellationReason` text,
	`cancelledAt` timestamp,
	`cancelledById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventBookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventTypeAvailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventTypeId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventTypeAvailability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventTypeDateOverrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventTypeId` int NOT NULL,
	`date` timestamp NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`startTime` varchar(5),
	`endTime` varchar(5),
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventTypeDateOverrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`duration` int NOT NULL,
	`color` varchar(32) DEFAULT 'blue',
	`locationType` enum('google_meet','phone','in_person','custom') DEFAULT 'google_meet',
	`locationDetails` text,
	`hostId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`minNoticeHours` int DEFAULT 4,
	`maxDaysInFuture` int DEFAULT 60,
	`bufferBefore` int DEFAULT 0,
	`bufferAfter` int DEFAULT 0,
	`requiresConfirmation` boolean DEFAULT false,
	`confirmationMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventTypes_slug_unique` UNIQUE(`slug`)
);
