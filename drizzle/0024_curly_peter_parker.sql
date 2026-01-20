CREATE TABLE `ohweeeTypingIndicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`lastTypingAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohweeeTypingIndicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ohweeeUnreadMarkers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ohweeeId` int NOT NULL,
	`userId` int NOT NULL,
	`markedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohweeeUnreadMarkers_id` PRIMARY KEY(`id`)
);
