ALTER TABLE `emailSettings` ADD `shiftAssigned` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `emailSettings` ADD `shiftChanged` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `emailSettings` ADD `shiftCancelled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `emailSettings` ADD `shiftSwapRequest` boolean DEFAULT true NOT NULL;