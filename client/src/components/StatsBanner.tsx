import { useGeneratorStats } from "@/hooks/use-generator";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Package, Download } from "lucide-react";

export function StatsBanner() {
  const { data: stats, isLoading } = useGeneratorStats();

  if (isLoading || !stats) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border-y border-border/50 py-3"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-sm text-muted-foreground">
        
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary">
            <Download className="w-4 h-4" />
          </div>
          <span className="font-medium text-foreground">{stats.totalProjects.toLocaleString()}</span>
          <span>Projects Generated</span>
        </div>

        {stats.popularDependencies.length > 0 && (
          <div className="flex items-center gap-2 hidden sm:flex">
            <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500">
              <Package className="w-4 h-4" />
            </div>
            <span>Top Dependency:</span>
            <span className="font-medium text-foreground">{stats.popularDependencies[0].name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
