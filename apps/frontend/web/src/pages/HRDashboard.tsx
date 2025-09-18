import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HRDashboard() {
  console.log('🎯 HRDashboard component is rendering!');
  
  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div className="space-y-8 p-6">
        {/* Test Minimal Content */}
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Dashboard HR - TEST MINIMO
          </h1>
          <p className="text-muted-foreground mt-1">
            Se vedi questo, il componente base funziona!
          </p>
        </div>

        {/* Test Card */}
        <Card className="hr-card" data-testid="card-test">
          <CardHeader>
            <CardTitle>Card Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Questo è un test per verificare se i componenti base funzionano.</p>
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <p className="text-sm">Glassmorphismo test - se vedi questo sfondo semitrasparente, il CSS funziona!</p>
            </div>
          </CardContent>
        </Card>

        {/* Test Background Colors */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--brand-orange))' }}>
            <p className="text-white font-bold">WindTre Orange - se vedi questo arancione, le CSS variables funzionano!</p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--brand-purple))' }}>
            <p className="text-white font-bold">WindTre Purple - se vedi questo viola, tutto è OK!</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}