ALTER TABLE `tasks` ADD `reminderDays` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `reminderSent` boolean DEFAULT false;