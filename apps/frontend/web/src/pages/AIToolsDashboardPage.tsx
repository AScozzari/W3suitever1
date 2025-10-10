import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3, Calculator, FileSpreadsheet, Sparkles, Brain, MessageSquare } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

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
    title: "PDC Analyzer",
    description: "Estrai automaticamente dati da proposte contrattuali PDF con OCR e AI. Genera JSON strutturati per integrazione cassa.",
    icon: <FileText className="h-8 w-8" />,
    route: "/ai-tools/pdc-analyzer",
    status: "available",
    color: "text-orange-500 dark:text-orange-400",
  },
  {
    id: "workflow-builder",
    title: "Workflow Builder AI",
    description: "Crea workflow aziendali complessi usando linguaggio naturale. L'AI genera automaticamente diagrammi e logica di processo.",
    icon: <Brain className="h-8 w-8" />,
    route: "/ai-tools/workflow-builder",
    status: "coming_soon",
    color: "text-purple-500 dark:text-purple-400",
  },
  {
    id: "financial-insights",
    title: "Financial Insights",
    description: "Analisi predittiva di bilanci, flussi di cassa e KPI finanziari. Forecasting automatico con machine learning.",
    icon: <BarChart3 className="h-8 w-8" />,
    route: "/ai-tools/financial-insights",
    status: "coming_soon",
    color: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "commissioning-analysis",
    title: "Commissioning AI",
    description: "Calcolo intelligente delle provvigioni venditori. Analisi pattern vendita e suggerimenti incentivi.",
    icon: <Calculator className="h-8 w-8" />,
    route: "/ai-tools/commissioning",
    status: "coming_soon",
    color: "text-green-500 dark:text-green-400",
  },
  {
    id: "report-generator",
    title: "Report Generator",
    description: "Genera report esecutivi automatici da dati grezzi. Natural language queries per business intelligence.",
    icon: <FileSpreadsheet className="h-8 w-8" />,
    route: "/ai-tools/reports",
    status: "coming_soon",
    color: "text-indigo-500 dark:text-indigo-400",
  },
  {
    id: "customer-assistant",
    title: "Customer Assistant",
    description: "Chatbot AI per assistenza clienti multilingua. Integrazione con knowledge base aziendale e CRM.",
    icon: <MessageSquare className="h-8 w-8" />,
    route: "/ai-tools/customer-assistant",
    status: "coming_soon",
    color: "text-pink-500 dark:text-pink-400",
  },
];

export default function AIToolsDashboardPage() {
  const [currentModule, setCurrentModule] = useState("ai");
  const [location, setLocation] = useLocation();
  
  // Estrai tenant slug dalla URL
  const tenantSlug = location.split('/')[1] || 'staging';

  const handleToolClick = (tool: AITool) => {
    if (tool.status === "available") {
      setLocation(`/${tenantSlug}${tool.route}`);
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6">
        {/* Header con gradiente WindTre */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)",
            color: "white",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">AI Tools Ecosystem</h1>
              <p className="mt-1 text-lg text-white/90">
                Strumenti intelligenti powered by AI per automatizzare processi aziendali
              </p>
            </div>
          </div>
        </div>

        {/* Tools Grid - Vista a Blocchi */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {aiTools.map((tool) => (
            <Card
              key={tool.id}
              className={`group relative overflow-hidden border-2 transition-all duration-300 ${
                tool.status === "available"
                  ? "cursor-pointer border-gray-200 hover:border-orange-400 hover:shadow-xl hover:scale-[1.03] dark:border-gray-700 dark:hover:border-orange-500"
                  : "opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => handleToolClick(tool)}
              data-testid={`card-ai-tool-${tool.id}`}
            >
              {/* Coming Soon Badge */}
              {tool.status === "coming_soon" && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
                    Coming Soon
                  </span>
                </div>
              )}

              <CardHeader className="space-y-4 pb-4">
                <div className={`${tool.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  {tool.icon}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tool.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                <CardDescription className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  {tool.description}
                </CardDescription>
              </CardContent>

              {/* Hover Effect Overlay con gradiente WindTre */}
              {tool.status === "available" && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-purple-600/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              )}

              {/* Indicatore di status */}
              <div className="absolute bottom-4 right-4">
                {tool.status === "available" && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Disponibile
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Info Section con design WindTre */}
        <Card className="border-2 border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950/20 dark:to-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-orange-700 dark:text-orange-400">
              <Sparkles className="h-6 w-6" />
              Come funzionano i tool AI?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                1
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Upload & Analisi:</strong> Carica i tuoi documenti (PDF, Excel, immagini) e lascia che l'AI estragga i dati automaticamente con precisione.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-bold">
                2
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Review & Training:</strong> Correggi eventuali errori di estrazione. Il sistema impara dalle tue correzioni per migliorare nel tempo grazie al machine learning.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white font-bold">
                3
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Export & Integrazione:</strong> Esporta i dati strutturati in JSON, CSV o Excel. Integra direttamente con API di cassa e ERP aziendali.
              </div>
            </div>
            <div className="mt-6 rounded-lg bg-white/50 dark:bg-gray-800/50 p-4 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 <strong className="text-orange-600 dark:text-orange-400">Pro Tip:</strong> I tool AI sono condivisi tra tutti i tenant del sistema. Le correzioni e i training di un tenant migliorano la precisione per tutti, creando un ecosistema intelligente collaborativo!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
