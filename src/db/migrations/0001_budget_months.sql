CREATE TABLE `budget_months` (
	`month` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `budgets` ADD `month` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `budgets_month_idx` ON `budgets` (`month`);--> statement-breakpoint
-- Budget esistenti: appartengono al mese in cui sono stati creati
UPDATE `budgets` SET `month` = strftime('%Y-%m', `created_at` / 1000, 'unixepoch', 'localtime') WHERE `month` = '';--> statement-breakpoint
INSERT OR IGNORE INTO `budget_months` (`month`, `created_at`) SELECT `month`, MIN(`created_at`) FROM `budgets` GROUP BY `month`;
