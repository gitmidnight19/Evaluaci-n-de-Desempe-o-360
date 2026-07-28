CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_name` text DEFAULT '' NOT NULL,
	`employee_id` text DEFAULT '' NOT NULL,
	`period` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `evaluations_employee_id_idx` ON `evaluations` (`employee_id`);--> statement-breakpoint
CREATE INDEX `evaluations_period_idx` ON `evaluations` (`period`);