CREATE TABLE `pendingInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('user','editor','admin') NOT NULL DEFAULT 'user',
	`invitedById` int NOT NULL,
	`inviteToken` varchar(64) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`acceptedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pendingInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `pendingInvitations_inviteToken_unique` UNIQUE(`inviteToken`)
);
