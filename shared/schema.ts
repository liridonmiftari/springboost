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
  scaffoldAuth: z.boolean().default(false),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type GeneratedProject = typeof generatedProjects.$inferSelect;
