ALTER TABLE `calendarEvents` ADD `isSickLeave` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `sickLeaveNote` text;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `sickLeaveMarkedAt` timestamp;--> statement-breakpoint
ALTER TABLE `calendarEvents` ADD `sickLeaveMarkedById` int;