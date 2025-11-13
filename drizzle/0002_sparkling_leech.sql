ALTER TABLE `stores` ADD `default_print_receipt` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `printer_encoding` varchar(10) DEFAULT 'gbk' NOT NULL;