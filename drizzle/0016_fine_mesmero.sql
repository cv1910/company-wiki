ALTER TABLE `calendarEvents` ADD `link` varchar(1000);--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `invites` json;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `isCircleEvent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `showCountdown` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `reminderMinutes` int;