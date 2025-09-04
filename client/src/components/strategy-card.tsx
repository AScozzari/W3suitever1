import { Card } from "@/components/ui/card";
import { Check, LayoutTemplate, GitBranch, Share } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: "primary" | "secondary" | "green";
}

const iconMap = {
  "template": LayoutTemplate,
  "git-branch": GitBranch,
  "share": Share,
};

const colorMap = {
  primary: "from-primary to-secondary",
  secondary: "from-secondary to-primary", 
  green: "from-green-500 to-blue-500",
};

export default function StrategyCard({ icon, title, description, features, color }: StrategyCardProps) {
  const IconComponent = iconMap[icon as keyof typeof iconMap];
  
  return (
    <Card 
      className="glass-card border-border hover:scale-105 transition-transform duration-300 p-6"
      data-testid={`strategy-card-${title.toLowerCase()}`}
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
          colorMap[color]
        )}>
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <h4 className="font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <div className="space-y-2">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
