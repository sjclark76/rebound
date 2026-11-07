ALTER TABLE "exercise" ADD COLUMN "fine_primary" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "fine_secondary" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "lengthened" boolean DEFAULT false NOT NULL;