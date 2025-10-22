import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'w3_campaign_creation_mode_preference';

export type CampaignCreationMode = 'wizard' | 'advanced';

export interface UseCampaignCreationModeReturn {
  mode: CampaignCreationMode;
  setMode: (mode: CampaignCreationMode) => void;
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  preference: CampaignCreationMode | null;
  savePreference: (mode: CampaignCreationMode) => void;
  clearPreference: () => void;
  totalSteps: number;
}

/**
 * Hook for managing campaign creation mode (wizard vs advanced)
 * Handles localStorage persistence and wizard step navigation
 */
export function useCampaignCreationMode(): UseCampaignCreationModeReturn {
  const TOTAL_STEPS = 3;

  // Load preference from localStorage
  const loadPreference = useCallback((): CampaignCreationMode | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'wizard' || stored === 'advanced') {
        return stored;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load campaign creation mode preference:', error);
      return null;
    }
  }, []);

  // Initialize with preference or default to wizard for first-time users
  const [preference, setPreferenceState] = useState<CampaignCreationMode | null>(loadPreference);
  const [mode, setModeState] = useState<CampaignCreationMode>(preference || 'wizard');
  const [currentStep, setCurrentStep] = useState(1);

  // Save preference to localStorage
  const savePreference = useCallback((newMode: CampaignCreationMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
      setPreferenceState(newMode);
    } catch (error) {
      console.warn('Failed to save campaign creation mode preference:', error);
    }
  }, []);

  // Clear preference from localStorage
  const clearPreference = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setPreferenceState(null);
    } catch (error) {
      console.warn('Failed to clear campaign creation mode preference:', error);
    }
  }, []);

  // Set mode and reset step to 1 when mode changes
  const setMode = useCallback((newMode: CampaignCreationMode) => {
    setModeState(newMode);
    setCurrentStep(1);
  }, []);

  // Navigation methods
  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

  // Derived state
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  return {
    mode,
    setMode,
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    preference,
    savePreference,
    clearPreference,
    totalSteps: TOTAL_STEPS,
  };
}
