import { Code2, LayoutDashboard, Package, Server, Palette, Database, Layers, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    title: "Projects",
    items: [
      { 
        name: "Overview", 
        icon: LayoutDashboard, 
        href: "#", 
        active: true,
        status: undefined
      },
      { 
        name: "Suite Frontend", 
        icon: Package, 
        href: "#", 
        active: false,
        status: { type: "active", text: "Active" } 
      },
      { 
        name: "Suite API", 
        icon: Server, 
        href: "#", 
        active: false,
        status: { type: "active", text: "Active" } 
      },
      { 
        name: "Brand Interface", 
        icon: Palette, 
        href: "#", 
        active: false,
        status: { type: "pending", text: "Deploy" } 
      },
      { 
        name: "Shared DB", 
        icon: Database, 
        href: "#", 
        active: false,
        status: { type: "active", text: "Live" } 
      },
    ]
  },
  {
    title: "Shared Resources",
    items: [
      { 
        name: "UI Components", 
        icon: Layers, 
        href: "#",
        active: false,
        status: undefined
      },
      { 
        name: "Design Tokens", 
        icon: Palette, 
        href: "#",
        active: false,
        status: undefined
      },
      { 
        name: "SDK Library", 
        icon: Share2, 
        href: "#",
        active: false,
        status: undefined
      },
    ]
  }
];

export default function Sidebar() {
  return (
    <aside className="w-64 glass border-r border-border p-6 overflow-y-auto" data-testid="sidebar">
      {/* Logo Section */}
      <div className="flex items-center space-x-3 mb-8" data-testid="logo-section">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">W3 Suite</h1>
          <p className="text-sm text-muted-foreground">Dev Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2" data-testid="navigation">
        {navigation.map((section, sectionIdx) => (
          <div key={section.title} className={cn(sectionIdx > 0 && "mt-6")}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {section.title}
            </div>
            
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                    item.active 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  {item.status && (
                    <span 
                      className={cn(
                        "ml-auto text-xs px-2 py-1 rounded-full",
                        item.status.type === "active" && "status-active text-white",
                        item.status.type === "pending" && "status-pending text-black"
                      )}
                    >
                      {item.status.text}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
