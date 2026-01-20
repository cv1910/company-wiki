CREATE TABLE `user_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mentionsEnabled` boolean NOT NULL DEFAULT true,
	`directMessagesEnabled` boolean NOT NULL DEFAULT true,
	`roomUpdatesEnabled` boolean NOT NULL DEFAULT true,
	`soundEnabled` boolean NOT NULL DEFAULT true,
	`taskRemindersEnabled` boolean NOT NULL DEFAULT true,
	`taskAssignmentsEnabled` boolean NOT NULL DEFAULT true,
	`articleUpdatesEnabled` boolean NOT NULL DEFAULT false,
	`browserNotificationsEnabled` boolean NOT NULL DEFAULT true,
	`emailDigestEnabled` boolean NOT NULL DEFAULT false,
	`emailDigestFrequency` enum('daily','weekly','never') NOT NULL DEFAULT 'never',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_notification_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`position` varchar(255),
	`department` varchar(255),
	`location` varchar(255),
	`phone` varchar(50),
	`mobilePhone` varchar(50),
	`skills` text,
	`bio` text,
	`linkedinUrl` varchar(500),
	`startDate` timestamp,
	`manager` varchar(255),
	`status` enum('available','busy','away','offline') NOT NULL DEFAULT 'available',
	`statusMessage` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
