import { Card } from "@/components/ui/card";
import { Folder, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const architecture = [
  { name: "w3-suite/", type: "root", level: 0 },
  { name: "apps/", type: "folder", level: 1 },
  { name: "frontend/web/", type: "folder", level: 2, color: "text-muted-foreground" },
  { name: "brand-web/", type: "folder", level: 2, color: "text-muted-foreground" },
  { name: "suite-api/", type: "folder", level: 2, color: "text-muted-foreground" },
  { name: "brand-api/", type: "folder", level: 2, color: "text-muted-foreground" },
  { name: "packages/", type: "folder", level: 1 },
  { name: "ui/", type: "package", level: 2, color: "text-green-400" },
  { name: "tokens/", type: "package", level: 2, color: "text-green-400" },
  { name: "sdk/", type: "package", level: 2, color: "text-green-400" },
];

export default function ArchitectureDiagram() {
  return (
    <Card className="glass-card border-border p-6" data-testid="architecture-diagram">
      <h4 className="font-semibold mb-4 text-foreground">Monorepo Structure</h4>
      <div className="space-y-3 text-sm font-mono">
        {architecture.map((item, idx) => {
          const Icon = item.type === "package" ? Package : Folder;
          const iconColor = item.type === "package" ? "text-green-400" : 
                           item.level === 0 ? "text-primary" :
                           item.level === 1 ? "text-secondary" : "text-muted-foreground";
          
          return (
            <div 
              key={idx} 
              className="flex items-center"
              style={{ marginLeft: `${item.level * 24}px` }}
            >
              <Icon className={cn("w-4 h-4 mr-2", iconColor)} />
              <span className={item.color || (item.level === 0 ? "text-foreground" : "text-muted-foreground")}>
                {item.name}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
