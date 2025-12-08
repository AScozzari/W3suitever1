import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Wand2, Settings, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface CampaignCreationChoiceProps {
  open: boolean;
  onClose: () => void;
  onSelectWizard: (remember: boolean) => void;
  onSelectStandard: (remember: boolean) => void;
}

export function CampaignCreationChoice({ 
  open, 
  onClose, 
  onSelectWizard, 
  onSelectStandard 
}: CampaignCreationChoiceProps) {
  const [rememberChoice, setRememberChoice] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            Crea Nuova Campagna
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            Scegli il metodo di creazione più adatto alle tue esigenze
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Wizard Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="p-6 cursor-pointer border-2 border-transparent hover:border-orange-500/50 transition-all duration-200 bg-gradient-to-br from-orange-50/50 to-purple-50/50 dark:from-orange-950/20 dark:to-purple-950/20"
              onClick={() => onSelectWizard(rememberChoice)}
              data-testid="card-wizard-mode"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Wizard Guidato
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Perfetto per principianti
                  </p>
                </div>

                <ul className="text-sm text-left space-y-2 w-full">
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Processo guidato in 3 step</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Configurazione semplificata</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Anteprima riepilogativa</span>
                  </li>
                </ul>

                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  data-testid="button-select-wizard"
                >
                  Usa Wizard
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Standard Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="p-6 cursor-pointer border-2 border-transparent hover:border-purple-500/50 transition-all duration-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20"
              onClick={() => onSelectStandard(rememberChoice)}
              data-testid="card-standard-mode"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Modal Standard
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Per utenti esperti
                  </p>
                </div>

                <ul className="text-sm text-left space-y-2 w-full">
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Accesso a tutte le opzioni</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Controllo granulare</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Form singolo completo</span>
                  </li>
                </ul>

                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  data-testid="button-select-standard"
                >
                  Usa Modal Standard
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Remember Choice Checkbox */}
        <div className="flex items-center space-x-2 mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <Checkbox
            id="remember-choice"
            checked={rememberChoice}
            onCheckedChange={(checked) => setRememberChoice(checked === true)}
            data-testid="checkbox-remember-choice"
          />
          <label
            htmlFor="remember-choice"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Ricorda la mia scelta (potrai cambiarla in seguito)
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
