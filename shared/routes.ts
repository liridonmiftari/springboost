import { z } from 'zod';
import { projectConfigSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  generator: {
    create: {
      method: 'POST' as const,
      path: '/api/generate',
      input: projectConfigSchema,
      responses: {
        200: z.any(), // Blob/File response
        400: errorSchemas.validation,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalProjects: z.number(),
          popularDependencies: z.array(z.object({
            name: z.string(),
            count: z.number()
          }))
        }),
      },
    },
  },
};

// Available dependencies for the UI
export const AVAILABLE_DEPENDENCIES = [
  { id: 'web', name: 'Spring Web', description: 'Build web, including RESTful, applications using Spring MVC.' },
  { id: 'data-jpa', name: 'Spring Data JPA', description: 'Persist data in SQL stores with Java Persistence API using Spring Data and Hibernate.' },
  { id: 'security', name: 'Spring Security', description: 'Highly customizable authentication and access-control framework.' },
  { id: 'thyme', name: 'Thymeleaf', description: 'A modern server-side Java template engine.' },
  { id: 'lombok', name: 'Lombok', description: 'Java annotation library which helps to reduce boilerplate code.' },
  { id: 'devtools', name: 'Spring Boot DevTools', description: 'Provides fast application restarts, LiveReload, and configurations for enhanced development experience.' },
  { id: 'postgresql', name: 'PostgreSQL Driver', description: 'A JDBC and R2DBC driver that allows Java programs to connect to a PostgreSQL database.' },
  { id: 'h2', name: 'H2 Database', description: 'Provides a fast in-memory database that supports JDBC API and R2DBC access.' },
];
