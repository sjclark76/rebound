import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { INJURY_MODES } from "./vocab";

export * from "./auth-schema";

export const injuryMode = pgEnum("injury_mode", INJURY_MODES);

/** Exercise catalogue, seeded from free-exercise-db. */
export const exercise = pgTable("exercise", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  equipment: text("equipment"), // null = no equipment
  category: text("category").notNull(), // strength, stretching, plyometrics...
  level: text("level").notNull(), // beginner, intermediate, expert
  force: text("force"), // push, pull, static
  mechanic: text("mechanic"), // compound, isolation
  primaryMuscles: text("primary_muscles").array().notNull(),
  secondaryMuscles: text("secondary_muscles").array().notNull(),
  instructions: text("instructions").array().notNull(),
  images: text("images").array().notNull(),
});

/** Equipment each user owns. */
export const userEquipment = pgTable(
  "user_equipment",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    equipment: text("equipment").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.equipment] })],
);

/** Active or past injuries, expressed against the muscle vocabulary. */
export const injury = pgTable("injury", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  muscle: text("muscle").notNull(),
  mode: injuryMode("mode").notNull(),
  severity: integer("severity").notNull().default(3), // 1 (niggle) – 5 (severe)
  notes: text("notes"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const workout = pgTable("workout", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const workoutSet = pgTable("workout_set", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workout.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercise.id),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  durationSec: integer("duration_sec"),
});
