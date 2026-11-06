CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
-- The Bowflex's kg | lb toggle. Gear with a weight list keeps a unit on each weight instead.
CREATE TABLE "equipment_unit" (
	"user_id" text NOT NULL,
	"equipment" text NOT NULL,
	"unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	CONSTRAINT "equipment_unit_user_id_equipment_pk" PRIMARY KEY("user_id","equipment")
);--> statement-breakpoint
-- Fixed gear: the weights a user owns, each with its unit.
CREATE TABLE "equipment_weight" (
	"user_id" text NOT NULL,
	"equipment" text NOT NULL,
	"weight" real NOT NULL,
	"unit" "weight_unit" NOT NULL,
	CONSTRAINT "equipment_weight_user_id_equipment_weight_unit_pk" PRIMARY KEY("user_id","equipment","weight","unit")
);--> statement-breakpoint
-- Adjustable gear: the one range it adjusts through.
CREATE TABLE "equipment_range" (
	"user_id" text NOT NULL,
	"equipment" text NOT NULL,
	"unit" "weight_unit" NOT NULL,
	"start" real NOT NULL,
	"step" real NOT NULL,
	"top" real NOT NULL,
	CONSTRAINT "equipment_range_user_id_equipment_pk" PRIMARY KEY("user_id","equipment")
);--> statement-breakpoint
ALTER TABLE "equipment_unit" ADD CONSTRAINT "equipment_unit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_weight" ADD CONSTRAINT "equipment_weight_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_range" ADD CONSTRAINT "equipment_range_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Weight groups are replaced by the two tables above. They never reached production.
DROP TABLE "equipment_weight_group";--> statement-breakpoint
DROP TYPE "public"."weight_group_type";--> statement-breakpoint
-- Logged and starting weights carry their unit. Every existing value is in kg, which is the column default.
ALTER TABLE "starting_weight" RENAME COLUMN "weight_kg" TO "weight";--> statement-breakpoint
ALTER TABLE "starting_weight" ADD COLUMN "unit" "weight_unit" DEFAULT 'kg' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_set" RENAME COLUMN "weight_kg" TO "weight";--> statement-breakpoint
ALTER TABLE "workout_set" ADD COLUMN "unit" "weight_unit" DEFAULT 'kg' NOT NULL;
