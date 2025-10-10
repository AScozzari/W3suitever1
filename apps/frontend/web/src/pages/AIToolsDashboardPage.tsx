import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3, Calculator, FileSpreadsheet, Sparkles } from "lucide-react";
import { useRequiredTenant } from "@/hooks/useTenantSafety";

interface AITool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  status: "available" | "coming_soon";
  color: string;
}

const aiTools: AITool[] = [
  {
    id: "pdc-analyzer",
    title: "AI PDC Analyzer",
    description: "Estrai automaticamente dati da proposte contrattuali PDF con OCR e AI. Genera JSON strutturati per integrazione cassa.",
    icon: <FileText className="h-8 w-8" />,
    route: "/ai-tools/pdc-analyzer",
    status: "available",
    color: "text-orange-500 dark:text-orange-400",
  },
  {
    id: "financial-insights",
    title: "Financial Insights AI",
    description: "Analisi predittiva di bilanci, flussi di cassa e KPI finanziari. Forecasting automatico con machine learning.",
    icon: <BarChart3 className="h-8 w-8" />,
    route: "/ai-tools/financial-insights",
    status: "coming_soon",
    color: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "commissioning-analysis",
    title: "Commissioning Analysis",
    description: "Calcolo intelligente delle provvigioni venditori. Analisi pattern vendita e suggerimenti incentivi.",
    icon: <Calculator className="h-8 w-8" />,
    route: "/ai-tools/commissioning",
    status: "coming_soon",
    color: "text-green-500 dark:text-green-400",
  },
  {
    id: "report-generator",
    title: "AI Report Generator",
    description: "Genera report esecutivi automatici da dati grezzi. Natural language queries per business intelligence.",
    icon: <FileSpreadsheet className="h-8 w-8" />,
    route: "/ai-tools/reports",
    status: "coming_soon",
    color: "text-purple-500 dark:text-purple-400",
  },
];

export default function AIToolsDashboardPage() {
  const [, setLocation] = useLocation();
  const { tenant } = useRequiredTenant();

  const handleToolClick = (tool: AITool) => {
    if (tool.status === "available") {
      setLocation(`/${tenant.slug}${tool.route}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Tools</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Strumenti intelligenti powered by AI per automatizzare processi aziendali
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {aiTools.map((tool) => (
          <Card
            key={tool.id}
            className={`group relative overflow-hidden transition-all duration-300 ${
              tool.status === "available"
                ? "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
                : "opacity-60 cursor-not-allowed"
            }`}
            onClick={() => handleToolClick(tool)}
            data-testid={`card-ai-tool-${tool.id}`}
          >
            {/* Coming Soon Badge */}
            {tool.status === "coming_soon" && (
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Coming Soon
                </span>
              </div>
            )}

            <CardHeader className="space-y-3">
              <div className={`${tool.color} transition-transform group-hover:scale-110`}>
                {tool.icon}
              </div>
              <CardTitle className="text-xl">{tool.title}</CardTitle>
            </CardHeader>

            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {tool.description}
              </CardDescription>
            </CardContent>

            {/* Hover Effect Overlay */}
            {tool.status === "available" && (
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-purple-600/5 opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <Sparkles className="h-5 w-5" />
            Come funzionano i tool AI?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong>1. Upload & Analisi:</strong> Carica i tuoi documenti (PDF, Excel, immagini) e lascia che l'AI estragga i dati automaticamente.
          </p>
          <p>
            <strong>2. Review & Training:</strong> Correggi eventuali errori di estrazione. Il sistema impara dalle tue correzioni per migliorare nel tempo.
          </p>
          <p>
            <strong>3. Export & Integrazione:</strong> Esporta i dati strutturati in JSON, CSV o Excel. Integra direttamente con API di cassa e ERP.
          </p>
          <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
            💡 <strong>Tip:</strong> I tool AI sono condivisi tra tutti i tenant. Le correzioni di un tenant migliorano la precisione per tutti!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
