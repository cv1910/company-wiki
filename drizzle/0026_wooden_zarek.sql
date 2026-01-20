CREATE TABLE `ohweee_poll_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pollId` int NOT NULL,
	`text` varchar(255) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohweee_poll_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ohweee_poll_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pollId` int NOT NULL,
	`optionId` int NOT NULL,
	`userId` int NOT NULL,
	`votedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohweee_poll_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ohweee_polls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`ohweeeId` int,
	`question` varchar(500) NOT NULL,
	`allowMultiple` boolean NOT NULL DEFAULT false,
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`isClosed` boolean NOT NULL DEFAULT false,
	`closedAt` timestamp,
	`expiresAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ohweee_polls_id` PRIMARY KEY(`id`)
);
