CREATE TABLE `articleEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`embedding` json NOT NULL,
	`embeddingModel` varchar(64) NOT NULL DEFAULT 'text-embedding-3-small',
	`contentHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articleEmbeddings_id` PRIMARY KEY(`id`),
	CONSTRAINT `articleEmbeddings_articleId_unique` UNIQUE(`articleId`)
);
--> statement-breakpoint
CREATE TABLE `sopEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sopId` int NOT NULL,
	`embedding` json NOT NULL,
	`embeddingModel` varchar(64) NOT NULL DEFAULT 'text-embedding-3-small',
	`contentHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sopEmbeddings_id` PRIMARY KEY(`id`),
	CONSTRAINT `sopEmbeddings_sopId_unique` UNIQUE(`sopId`)
);
