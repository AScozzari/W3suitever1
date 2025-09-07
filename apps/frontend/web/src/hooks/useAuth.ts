import { useQuery } from "@tanstack/react-query";
import { oauth2Client } from "../services/OAuth2Client";
import { useEffect, useState } from "react";

// HOOK TEMPORANEAMENTE DISABILITATO PER DEBUG
export function useAuth() {
  console.log('useAuth: DISABLED FOR DEBUG');
  
  // Ritorna sempre stato non autenticato, senza side effects
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
  };
}