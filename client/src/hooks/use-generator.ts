import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type ProjectConfig } from "@shared/routes";

// GET /api/stats
export function useGeneratorStats() {
  return useQuery({
    queryKey: [api.generator.stats.path],
    queryFn: async () => {
      const res = await fetch(api.generator.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.generator.stats.responses[200].parse(await res.json());
    },
    // Refresh stats every minute to show live activity
    refetchInterval: 60000,
  });
}

// POST /api/generate
export function useGenerateProject() {
  return useMutation({
    mutationFn: async (config: ProjectConfig) => {
      // Validate locally first
      const validatedConfig = api.generator.create.input.parse(config);
      
      const res = await fetch(api.generator.create.path, {
        method: api.generator.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedConfig),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          // Attempt to parse strictly with our error schema, or fallback
          try {
             const parsedError = api.generator.create.responses[400].parse(errorData);
             throw new Error(parsedError.message);
          } catch (e) {
             throw new Error("Invalid configuration provided");
          }
        }
        throw new Error("Failed to generate project");
      }

      // Return the Blob for download handling
      return await res.blob();
    },
  });
}
