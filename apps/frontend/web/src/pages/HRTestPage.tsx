import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Test di tutti i componenti HR per verificare che esistano
export default function HRTestPage() {
  const [currentModule] = useState('hr-test');

  return (
    <Layout currentModule={currentModule} setCurrentModule={() => {}}>
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>HR Test Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Pagina di test per verificare componenti HR</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}