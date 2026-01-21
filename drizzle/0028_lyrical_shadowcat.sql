CREATE TABLE `org_chart_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT 'Organigramm',
	`layoutType` enum('tree','horizontal','radial') NOT NULL DEFAULT 'tree',
	`showVacant` boolean NOT NULL DEFAULT true,
	`showDepartments` boolean NOT NULL DEFAULT true,
	`defaultZoom` int NOT NULL DEFAULT 100,
	`companyLogo` text,
	`updatedById` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_chart_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`department` varchar(255),
	`parentId` int,
	`userId` int,
	`color` varchar(32) DEFAULT 'blue',
	`sortOrder` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 0,
	`positionX` int,
	`positionY` int,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_positions_id` PRIMARY KEY(`id`)
);
