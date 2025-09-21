import React from 'react';
import Layout from '../components/Layout';

export default function TestPage() {
  return (
    <Layout>
      <div className="p-4">
        <h1>Test Page</h1>
        <p>If you see this, React is working!</p>
      </div>
    </Layout>
  );
}