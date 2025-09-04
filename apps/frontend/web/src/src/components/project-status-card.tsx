import { cn } from "@/lib/utils";

interface ProjectStatusCardProps {
  name: string;
  description: string;
  status: "active" | "pending" | "error";
  statusText: string;
}

const statusStyles = {
  active: {
    indicator: "status-active pulse-glow",
    badge: "bg-green-500/20 text-green-400"
  },
  pending: {
    indicator: "status-pending pulse-glow", 
    badge: "bg-yellow-500/20 text-yellow-400"
  },
  error: {
    indicator: "status-error pulse-glow",
    badge: "bg-red-500/20 text-red-400"
  }
};

export default function ProjectStatusCard({ name, description, status, statusText }: ProjectStatusCardProps) {
  const styles = statusStyles[status];
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-accent/20 border border-border"
      data-testid={`project-status-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center space-x-3">
        <div className={cn("w-3 h-3 rounded-full", styles.indicator)}></div>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <span className={cn("text-xs px-2 py-1 rounded", styles.badge)}>
        {statusText}
      </span>
    </div>
  );
}
