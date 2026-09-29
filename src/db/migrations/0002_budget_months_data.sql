-- Ripete la conversione dei budget esistenti della 0001: in sviluppo la 0001
-- poteva essere stata applicata senza questa parte. Idempotente.
-- Se il mese è già stato definito da una modifica successiva, quella prevale
-- e i vecchi budget senza mese vengono scartati (niente duplicati).
UPDATE `budgets` SET `month` = strftime('%Y-%m', `created_at` / 1000, 'unixepoch', 'localtime')
WHERE `month` = ''
  AND strftime('%Y-%m', `created_at` / 1000, 'unixepoch', 'localtime') NOT IN (SELECT `month` FROM `budget_months`);--> statement-breakpoint
DELETE FROM `budgets` WHERE `month` = '';--> statement-breakpoint
INSERT OR IGNORE INTO `budget_months` (`month`, `created_at`) SELECT `month`, MIN(`created_at`) FROM `budgets` GROUP BY `month`;
