CREATE TABLE `userDashboardSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`showWelcomeHero` boolean NOT NULL DEFAULT true,
	`showAnnouncements` boolean NOT NULL DEFAULT true,
	`showNavigation` boolean NOT NULL DEFAULT true,
	`showStats` boolean NOT NULL DEFAULT true,
	`showRecentArticles` boolean NOT NULL DEFAULT true,
	`showActivityFeed` boolean NOT NULL DEFAULT true,
	`showFavorites` boolean NOT NULL DEFAULT true,
	`showOnboardingProgress` boolean NOT NULL DEFAULT true,
	`widgetOrder` json NOT NULL DEFAULT ('["welcomeHero","announcements","navigation","stats","recentArticles","activityFeed","favorites","onboardingProgress"]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userDashboardSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userDashboardSettings_userId_unique` UNIQUE(`userId`)
);
