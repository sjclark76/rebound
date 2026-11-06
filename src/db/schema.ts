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
import { INJURY_MODES, UNITS } from "./vocab";

export * from "./auth-schema";

export const injuryMode = pgEnum("injury_mode", INJURY_MODES);
export const weightUnit = pgEnum("weight_unit", UNITS);

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

/** A weight the user owns on a fixed item (dumbbells, kettlebells, medicine ball), in the unit it is marked in. One item can hold kg and lb weights. Kept when the item is switched off. */
export const equipmentWeight = pgTable(
  "equipment_weight",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    equipment: text("equipment").notNull(),
    weight: real("weight").notNull(),
    unit: weightUnit("unit").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.equipment, t.weight, t.unit] })],
);

/** The one range an adjustable item adjusts through (start, step, top), in the unit it is marked in. */
export const equipmentRange = pgTable(
  "equipment_range",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    equipment: text("equipment").notNull(),
    unit: weightUnit("unit").notNull(),
    start: real("start").notNull(),
    step: real("step").notNull(),
    top: real("top").notNull(),
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
  /** The split the workout was started as (push, pull or legs). */
  split: text("split"),
  /** Set when the workout was left open for more than 24 hours and closed for the user. */
  autoClosedAt: timestamp("auto_closed_at"),
  /** Set when the user dismisses the "we closed your workout" notice. */
  noticeDismissedAt: timestamp("notice_dismissed_at"),
});

/** The exercises a workout started with: the plan is saved so it can't shift as sets are logged. */
export const workoutExercise = pgTable(
  "workout_exercise",
  {
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id),
    position: integer("position").notNull(),
    plannedSets: integer("planned_sets").notNull(),
    reps: text("reps").notNull(), // planned range, e.g. "8–10"
    skippedAt: timestamp("skipped_at"),
  },
  (t) => [primaryKey({ columns: [t.workoutId, t.exerciseId] })],
);

/** Seeded starting weight for an exercise the user has never logged. Replaced by the strength assessment later. */
export const startingWeight = pgTable(
  "starting_weight",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id),
    weight: real("weight").notNull(),
    unit: weightUnit("unit").notNull().default("kg"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })],
);

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
  weight: real("weight"),
  unit: weightUnit("unit").notNull().default("kg"),
  durationSec: integer("duration_sec"),
});
