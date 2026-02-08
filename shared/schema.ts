import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
// We'll track generated projects for analytics
export const generatedProjects = pgTable("generated_projects", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  artifactId: text("artifact_id").notNull(),
  javaVersion: text("java_version").notNull(),
  dependencies: text("dependencies").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
// Request schema for generating a project
const fieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  // These map to common Java types we know how to scaffold
  type: z.enum([
    "String",
    "Long",
    "Integer",
    "Double",
    "Boolean",
    "LocalDate",
    "LocalDateTime",
  ]),
});

const entitySchema = z.object({
  name: z.string().min(1, "Entity name is required"),
  fields: z.array(fieldSchema).min(1, "At least one field is required"),
});

export const projectConfigSchema = z.object({
  groupId: z.string().default("com.example"),
  artifactId: z.string().default("demo"),
  name: z.string().default("demo"),
  description: z.string().default("Demo project for Spring Boot"),
  packageName: z.string().default("com.example.demo"),
  javaVersion: z.enum(["17", "21"]).default("17"),
  bootVersion: z.string().default("3.2.2"),
  dependencies: z.array(z.string()).default([]),
  // Custom features
  scaffoldCrud: z.boolean().default(false),
  // Backwards-compatible: still allow a single entityName, but prefer `entities`
  entityName: z.string().optional(), // legacy single-entity name
  entities: z.array(entitySchema).default([]), // new multi-entity configuration
  scaffoldAuth: z.boolean().default(false),
  seedData: z.boolean().default(false), // Option for data initializer
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type GeneratedProject = typeof generatedProjects.$inferSelect;
