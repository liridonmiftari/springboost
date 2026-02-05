import { db } from "./db";
import { generatedProjects, type GeneratedProject, type ProjectConfig } from "@shared/schema";
import { count, desc, sql } from "drizzle-orm";

export interface IStorage {
  logProjectGeneration(config: ProjectConfig): Promise<GeneratedProject>;
  getStats(): Promise<{ totalProjects: number, popularDependencies: { name: string, count: number }[] }>;
}

export class DatabaseStorage implements IStorage {
  async logProjectGeneration(config: ProjectConfig): Promise<GeneratedProject> {
    const [project] = await db.insert(generatedProjects).values({
      groupId: config.groupId,
      artifactId: config.artifactId,
      javaVersion: config.javaVersion,
      dependencies: config.dependencies,
    }).returning();
    return project;
  }

  async getStats(): Promise<{ totalProjects: number, popularDependencies: { name: string, count: number }[] }> {
    const [total] = await db.select({ count: count() }).from(generatedProjects);
    
    // Simple aggregation for dependencies (mocked for now as array aggregation is complex in raw SQL/ORM mix without more setup)
    // In a real app we'd unnest the array and count
    return {
      totalProjects: total?.count || 0,
      popularDependencies: [] 
    };
  }
}

export const storage = new DatabaseStorage();
