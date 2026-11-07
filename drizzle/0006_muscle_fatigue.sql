CREATE TABLE "muscle_fatigue" (
	"user_id" text NOT NULL,
	"muscle" text NOT NULL,
	"value" real NOT NULL,
	"fast" real NOT NULL,
	"slow" real NOT NULL,
	"last_trained_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "muscle_fatigue_user_id_muscle_pk" PRIMARY KEY("user_id","muscle")
);
--> statement-breakpoint
ALTER TABLE "muscle_fatigue" ADD CONSTRAINT "muscle_fatigue_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;