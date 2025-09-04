import { Layers, Palette, Code, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: "primary" | "secondary" | "green" | "blue";
}

const iconMap = {
  "layers": Layers,
  "palette": Palette,
  "code": Code,
  "database": Database,
};

const colorMap = {
  primary: "text-primary",
  secondary: "text-secondary",
  green: "text-green-400",
  blue: "text-blue-400",
};

export default function ResourceCard({ icon, title, description, features, color }: ResourceCardProps) {
  const IconComponent = iconMap[icon as keyof typeof iconMap];
  
  return (
    <div className="gradient-border" data-testid={`resource-card-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
      <div className="p-4 rounded-lg">
        <div className="flex items-center space-x-3 mb-3">
          <IconComponent className={cn("w-5 h-5", colorMap[color])} />
          <h4 className="font-medium">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="text-xs space-y-1">
          {features.map((feature, idx) => (
            <div key={idx}>• {feature}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
