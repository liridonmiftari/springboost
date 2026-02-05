import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DependencyCardProps {
  id: string;
  name: string;
  description: string;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function DependencyCard({ id, name, description, selected, onToggle }: DependencyCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onToggle(id)}
      className={cn(
        "cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200",
        selected 
          ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" 
          : "bg-card border-border hover:border-primary/50 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className={cn(
            "font-semibold text-sm transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}>
            {name}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
        
        <div className={cn(
          "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
          selected 
            ? "bg-primary border-primary text-primary-foreground" 
            : "border-muted-foreground/30"
        )}>
          {selected && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>
    </motion.div>
  );
}
