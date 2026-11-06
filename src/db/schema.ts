import {
  index,
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
import { INJURY_MODES, WEIGHT_GROUP_TYPES } from "./vocab";

export * from "./auth-schema";

export const injuryMode = pgEnum("injury_mode", INJURY_MODES);
export const weightGroupType = pgEnum("weight_group_type", WEIGHT_GROUP_TYPES);

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

/** A saved batch of weights for one of a user's equipment items: a range (start, step, top) or picked weights. Kept when the item is switched off. */
export const equipmentWeightGroup = pgTable(
  "equipment_weight_group",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    equipment: text("equipment").notNull(),
    name: text("name"),
    type: weightGroupType("type").notNull(),
    start: real("start"), // range only, kg
    step: real("step"),
    top: real("top"),
    weights: real("weights").array().notNull().default([]), // picked only, kg
  },
  (t) => [index("equipment_weight_group_user_equipment_idx").on(t.userId, t.equipment)],
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
    weightKg: real("weight_kg").notNull(),
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
  weightKg: real("weight_kg"),
  durationSec: integer("duration_sec"),
});
