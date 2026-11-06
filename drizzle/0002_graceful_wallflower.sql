CREATE TYPE "public"."weight_group_type" AS ENUM('range', 'picked');--> statement-breakpoint
CREATE TABLE "equipment_weight_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"equipment" text NOT NULL,
	"name" text,
	"type" "weight_group_type" NOT NULL,
	"start" real,
	"step" real,
	"top" real,
	"weights" real[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment_weight_group" ADD CONSTRAINT "equipment_weight_group_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_weight_group_user_equipment_idx" ON "equipment_weight_group" USING btree ("user_id","equipment");