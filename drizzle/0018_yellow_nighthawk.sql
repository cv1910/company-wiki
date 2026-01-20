ALTER TABLE `eventBookings` ADD `remindersSent` varchar(100);--> statement-breakpoint
ALTER TABLE `eventTypes` ADD `reminderMinutes` varchar(100) DEFAULT '1440,60';--> statement-breakpoint
ALTER TABLE `eventTypes` ADD `sendGuestReminder` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `eventTypes` ADD `sendHostReminder` boolean DEFAULT true;