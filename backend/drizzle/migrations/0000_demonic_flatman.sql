CREATE TABLE `daily_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`total_pnl` real NOT NULL,
	`total_trades` integer NOT NULL,
	`winning_trades` integer NOT NULL,
	`losing_trades` integer NOT NULL,
	`win_rate` real NOT NULL,
	`avg_exposure` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_metrics_date_unique` ON `daily_metrics` (`date`);--> statement-breakpoint
CREATE TABLE `decision_log` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL,
	`decision_type` text NOT NULL,
	`reasoning` text NOT NULL,
	`input_data` text NOT NULL,
	`outcome` text NOT NULL,
	`related_trade_id` text
);
--> statement-breakpoint
CREATE TABLE `open_position` (
	`id` text PRIMARY KEY NOT NULL,
	`market` text NOT NULL,
	`condition_id` text NOT NULL,
	`token_id` text NOT NULL,
	`direction` text NOT NULL,
	`entry_price` real NOT NULL,
	`size` real NOT NULL,
	`top_trader_wallet` text NOT NULL,
	`opened_at` text NOT NULL,
	`stop_loss_level` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `top_trader_history` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL,
	`trader_wallet` text NOT NULL,
	`trader_name` text NOT NULL,
	`change_type` text NOT NULL,
	`previous_rank` integer,
	`new_rank` integer
);
--> statement-breakpoint
CREATE TABLE `trade_history` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL,
	`market` text NOT NULL,
	`condition_id` text NOT NULL,
	`direction` text NOT NULL,
	`amount` real NOT NULL,
	`price` real NOT NULL,
	`top_trader_wallet` text NOT NULL,
	`top_trader_name` text NOT NULL,
	`order_id` text,
	`status` text NOT NULL,
	`fail_reason` text,
	`decision_reasoning` text NOT NULL,
	`signal_multiplier` real NOT NULL,
	`confidence_weight` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_config` (
	`id` text PRIMARY KEY NOT NULL,
	`max_exposure_percent` real NOT NULL,
	`stop_loss_percent` real NOT NULL,
	`max_trades_per_hour` integer NOT NULL,
	`max_position_percent` real NOT NULL,
	`updated_at` text NOT NULL
);
