import { useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, BarChart3, Calculator, FileSpreadsheet, Sparkles, Brain, MessageSquare, Zap, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { useTenantNavigation } from '@/hooks/useTenantSafety';

interface AITool {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  useCases: string[];
  icon: React.ReactNode;
  route: string;
  status: "available" | "coming_soon";
  gradient: string;
  iconColor: string;
}

const aiTools: AITool[] = [
  {
    id: "pdc-analyzer",
    title: "PDC Analyzer",
    subtitle: "Intelligenza Artificiale per Contratti",
    description: "Trasforma i tuoi documenti contrattuali in dati strutturati in pochi secondi. Il nostro motore AI avanzato legge, comprende ed estrae automaticamente ogni informazione rilevante da PDF complessi, risparmiandoti ore di lavoro manuale.",
    benefits: [
      "Estrazione automatica con precisione 98%",
      "OCR avanzato per documenti scansionati",
      "Machine Learning che impara dal tuo feedback",
      "Export JSON/CSV ready per ERP"
    ],
    useCases: [
      "Proposte commerciali WindTre",
      "Contratti B2B e B2C",
      "Pratiche amministrative"
    ],
    icon: <FileText className="h-10 w-10" />,
    route: "/ai-tools/pdc-analyzer",
    status: "available",
    gradient: "from-orange-500 to-red-600",
    iconColor: "text-orange-500"
  },
  {
    id: "workflow-builder",
    title: "Workflow Builder AI",
    subtitle: "Processi Aziendali in Linguaggio Naturale",
    description: "Dimentica i complicati tool di workflow design. Descrivi il tuo processo aziendale a parole e l'AI creerà automaticamente il flusso completo con approvazioni, notifiche e logica condizionale. È come avere un analista di business sempre disponibile.",
    benefits: [
      "Generazione workflow da testo naturale",
      "Diagrammi visuali auto-generati",
      "Integrazione con RBAC e approvazioni",
      "Testing automatico del flusso"
    ],
    useCases: [
      "Approvazione budget e spese",
      "Onboarding dipendenti",
      "Gestione ordini clienti"
    ],
    icon: <Brain className="h-10 w-10" />,
    route: "/ai-tools/workflow-builder",
    status: "coming_soon",
    gradient: "from-purple-600 to-indigo-700",
    iconColor: "text-purple-600"
  },
  {
    id: "financial-insights",
    title: "Financial Insights",
    subtitle: "Previsioni Finanziarie Intelligenti",
    description: "Analisi predittiva che va oltre i numeri. Il nostro AI studia i pattern storici, identifica anomalie e prevede trend futuri con accuratezza sorprendente. Prendi decisioni strategiche basate su dati, non su intuizioni.",
    benefits: [
      "Forecasting automatico cashflow",
      "Anomaly detection su KPI finanziari",
      "Scenario analysis con AI",
      "Alert predittivi su rischi"
    ],
    useCases: [
      "Budget planning trimestrale",
      "Analisi margini per canale",
      "Credit risk assessment"
    ],
    icon: <BarChart3 className="h-10 w-10" />,
    route: "/ai-tools/financial-insights",
    status: "coming_soon",
    gradient: "from-blue-500 to-cyan-600",
    iconColor: "text-blue-500"
  },
  {
    id: "commissioning-analysis",
    title: "Commissioning AI",
    subtitle: "Incentivi Vendita Ottimizzati",
    description: "Sistema intelligente che calcola provvigioni complesse in automatico e suggerisce strategie di incentivazione basate su performance reali. Massimizza la motivazione del team sales identificando pattern vincenti e opportunità nascoste.",
    benefits: [
      "Calcolo provvigioni multi-livello",
      "Pattern analysis performance venditori",
      "Suggerimenti incentivi personalizzati",
      "Simulazioni payout scenari"
    ],
    useCases: [
      "Rete vendita diretta",
      "Agenti multi-canale",
      "Store manager rewards"
    ],
    icon: <Calculator className="h-10 w-10" />,
    route: "/ai-tools/commissioning",
    status: "coming_soon",
    gradient: "from-green-500 to-emerald-600",
    iconColor: "text-green-500"
  },
  {
    id: "report-generator",
    title: "Report Generator",
    subtitle: "Business Intelligence Conversazionale",
    description: "Chiedi al tuo database in linguaggio naturale e ricevi report esecutivi professionali in secondi. Niente più query SQL complicate o pivot table infinite - l'AI comprende la tua domanda e genera visualizzazioni perfette automaticamente.",
    benefits: [
      "Natural Language Queries (NLQ)",
      "Auto-generazione grafici e tabelle",
      "Export multi-formato (PDF/Excel/PPT)",
      "Scheduling report periodici"
    ],
    useCases: [
      "Report vendite settimanali",
      "Dashboard executive C-level",
      "Analisi performance punti vendita"
    ],
    icon: <FileSpreadsheet className="h-10 w-10" />,
    route: "/ai-tools/reports",
    status: "coming_soon",
    gradient: "from-indigo-600 to-violet-700",
    iconColor: "text-indigo-600"
  },
  {
    id: "customer-assistant",
    title: "Customer Assistant",
    subtitle: "Supporto Clienti H24 Intelligente",
    description: "Chatbot AI multilingua che comprende contesto, tono ed emozioni. Risponde istantaneamente attingendo alla knowledge base aziendale e al CRM, escalando al team umano solo quando necessario. Soddisfazione clienti al massimo livello, costi di supporto ridotti.",
    benefits: [
      "Supporto 24/7 multilingua (IT/EN/ES)",
      "Integrazione CRM e knowledge base",
      "Sentiment analysis conversazioni",
      "Handoff intelligente a operatori umani"
    ],
    useCases: [
      "FAQ automatiche prodotti",
      "Tracking ordini e spedizioni",
      "Assistenza tecnica first-level"
    ],
    icon: <MessageSquare className="h-10 w-10" />,
    route: "/ai-tools/customer-assistant",
    status: "coming_soon",
    gradient: "from-pink-500 to-rose-600",
    iconColor: "text-pink-500"
  },
];

export default function AIToolsDashboardPage() {
  const [currentModule, setCurrentModule] = useState("ai");
  const { navigate } = useTenantNavigation();

  const handleToolClick = (tool: AITool) => {
    if (tool.status === "available") {
      navigate(tool.route.replace(/^\//, ''));
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-8">
        {/* Hero Header con gradiente WindTre */}
        <div
          className="rounded-3xl p-10 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)",
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">AI Tools Ecosystem</h1>
                <p className="text-xl text-white/95 font-medium">
                  Potenzia il tuo business con l'intelligenza artificiale
                </p>
              </div>
            </div>
            <p className="text-white/90 text-lg max-w-3xl">
              Scopri gli strumenti AI che stanno rivoluzionando il modo di lavorare. Automazione intelligente, insights predittivi e decisioni data-driven a portata di click.
            </p>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* Tools Grid - 2 Colonne per card più grandi */}
        <div className="grid gap-8 lg:grid-cols-2 items-stretch">
          {aiTools.map((tool) => (
            <Card
              key={tool.id}
              className={`group relative overflow-hidden transition-all duration-500 max-w-[calc(100%-76px)] mx-auto h-full flex flex-col ${
                tool.status === "available"
                  ? "cursor-pointer hover:shadow-2xl hover:scale-[1.02]"
                  : "opacity-75 cursor-not-allowed"
              }`}
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
              }}
              onClick={() => handleToolClick(tool)}
              data-testid={`card-ai-tool-${tool.id}`}
            >
              {/* Status Badge */}
              <div className="absolute top-6 right-6 z-10">
                {tool.status === "coming_soon" ? (
                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold px-4 py-1.5 text-sm">
                    Coming Soon
                  </Badge>
                ) : (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold px-4 py-1.5 text-sm border-0 shadow-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      Disponibile Ora
                    </div>
                  </Badge>
                )}
              </div>

              <CardHeader className="space-y-3 !pb-2 !pt-3 !px-4">
                {/* Icon con gradiente */}
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-xl`}>
                  <div className="text-white">
                    {tool.icon}
                  </div>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                    {tool.title}
                  </CardTitle>
                  <p className={`text-lg font-semibold bg-gradient-to-r ${tool.gradient} bg-clip-text text-transparent`}>
                    {tool.subtitle}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 !pt-0 !px-4 !pb-3 flex-grow">
                {/* Descrizione principale */}
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  {tool.description}
                </p>

                {/* Benefits */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Key Benefits
                  </div>
                  <div className="space-y-2">
                    {tool.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Perfect For
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tool.useCases.map((useCase, idx) => (
                      <Badge key={idx} variant="outline" className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1">
                        {useCase}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* CTA per tool disponibili */}
                {tool.status === "available" && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className={`flex items-center justify-between text-sm font-semibold bg-gradient-to-r ${tool.gradient} bg-clip-text text-transparent`}>
                      <span>Inizia Subito →</span>
                      <ArrowRight className={`h-4 w-4 ${tool.iconColor}`} />
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Hover Effect Overlay */}
              {tool.status === "available" && (
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.03]`} />
              )}
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
