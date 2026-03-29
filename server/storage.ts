import { db } from "./db.js";
import { generatedProjects, type GeneratedProject, type ProjectConfig } from "@shared/schema";
import { count, desc, sql } from "drizzle-orm";

export interface IStorage {
  logProjectGeneration(config: ProjectConfig): Promise<GeneratedProject>;
  getStats(): Promise<{ totalProjects: number, popularDependencies: { name: string, count: number }[] }>;
}

export class DatabaseStorage implements IStorage {
  async logProjectGeneration(config: ProjectConfig): Promise<GeneratedProject> {
    if (!db) {
      throw new Error("Database not configured (missing DATABASE_URL)");
    }
    const [project] = await db.insert(generatedProjects).values({
      groupId: config.groupId,
      artifactId: config.artifactId,
      javaVersion: config.javaVersion,
      dependencies: config.dependencies,
    }).returning();
    return project;
  }

  async getStats(): Promise<{ totalProjects: number, popularDependencies: { name: string, count: number }[] }> {
    if (!db) {
      throw new Error("Database not configured (missing DATABASE_URL)");
    }
    const [total] = await db.select({ count: count() }).from(generatedProjects);
    
    // Simple aggregation for dependencies (mocked for now as array aggregation is complex in raw SQL/ORM mix without more setup)
    // In a real app we'd unnest the array and count
    return {
      totalProjects: total?.count || 0,
      popularDependencies: [] 
    };
  }
}

class MemoryStorage implements IStorage {
  private totalProjects = 0;

  async logProjectGeneration(_config: ProjectConfig): Promise<GeneratedProject> {
    // We don't persist generation logs without a DB; still increment for stats.
    this.totalProjects += 1;
    // Return a minimal object shaped like GeneratedProject as best-effort.
    return {
      id: -1,
      groupId: _config.groupId,
      artifactId: _config.artifactId,
      javaVersion: _config.javaVersion,
      dependencies: _config.dependencies,
      createdAt: new Date(),
    } as unknown as GeneratedProject;
  }

  async getStats(): Promise<{ totalProjects: number; popularDependencies: { name: string; count: number }[] }> {
    return { totalProjects: this.totalProjects, popularDependencies: [] };
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
