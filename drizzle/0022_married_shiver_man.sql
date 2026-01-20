CREATE TABLE `ohweeeReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ohweeeId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohweeeReactions_id` PRIMARY KEY(`id`)
);
