import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProjectConfig } from "@shared/schema";

interface CliModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ProjectConfig;
}

export function CliModal({ open, onOpenChange, config }: CliModalProps) {
  const [copied, setCopied] = useState(false);

  // Construct the curl command based on current config
  const baseUrl = window.location.origin;
  const command = `curl -X POST ${baseUrl}/api/generate \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(config, null, 2)}' \\
  --output ${config.artifactId}.zip`;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-mono">
            <Terminal className="w-5 h-5 text-primary" />
            CLI Usage
          </DialogTitle>
          <DialogDescription>
            Prefer the terminal? Generate this exact project configuration using curl.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 relative group">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-3 shadow-sm bg-background/50 hover:bg-background backdrop-blur text-xs font-mono"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          
          <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs md:text-sm overflow-x-auto custom-scrollbar">
            <code>{command}</code>
          </pre>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong>Pro Tip:</strong> You can alias this command in your <code>.bashrc</code> or <code>.zshrc</code> to quickly scaffold projects from anywhere.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
