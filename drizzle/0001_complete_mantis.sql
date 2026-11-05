CREATE TABLE "starting_weight" (
	"user_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"weight_kg" real NOT NULL,
	CONSTRAINT "starting_weight_user_id_exercise_id_pk" PRIMARY KEY("user_id","exercise_id")
);
--> statement-breakpoint
CREATE TABLE "workout_exercise" (
	"workout_id" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"planned_sets" integer NOT NULL,
	"reps" text NOT NULL,
	"skipped_at" timestamp,
	CONSTRAINT "workout_exercise_workout_id_exercise_id_pk" PRIMARY KEY("workout_id","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "split" text;--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "auto_closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "notice_dismissed_at" timestamp;--> statement-breakpoint
ALTER TABLE "starting_weight" ADD CONSTRAINT "starting_weight_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starting_weight" ADD CONSTRAINT "starting_weight_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;