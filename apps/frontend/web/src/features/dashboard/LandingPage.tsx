import { motion } from 'framer-motion';
// import { Button } from '../../../../../packages/ui/src/index';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30 dark:from-neutral-950 dark:via-primary-950/20 dark:to-secondary-950/20">
      <div className="container mx-auto px-4 py-16">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center">
              <span className="text-white font-bold text-2xl">W3</span>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gradient-brand mb-6">
            W3 Suite
          </h1>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Piattaforma enterprise multitenant per la gestione completa 
            del tuo business. CRM, POS, Magazzino e Analytics integrati.
          </p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button 
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-all duration-300 shadow-lg flex items-center mr-4"
              onClick={() => window.location.href = '/api/login'}
            >
              Accedi alla Suite
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: Shield,
              title: 'Sicurezza Enterprise',
              description: 'Autenticazione OAuth2/OIDC con MFA e isolamento tenant completo tramite RLS.'
            },
            {
              icon: Zap,
              title: 'Performance',
              description: 'Architettura moderna con React, Node.js e PostgreSQL per prestazioni ottimali.'
            },
            {
              icon: Globe,
              title: 'Multi-tenant',
              description: 'Gestione completa di più aziende con dati isolati e configurazioni personalizzate.'
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-brand/20 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            W3 Suite © 2024 - Enterprise Multi-tenant Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}