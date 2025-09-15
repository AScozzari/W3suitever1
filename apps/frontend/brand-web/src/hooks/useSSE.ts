import { useState, useEffect, useRef } from 'react';

interface SSEOptions {
  enabled?: boolean;
  fallbackInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface SSEResponse<T> {
  data: T | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  retry: () => void;
}

export function useSSE<T>(
  url: string,
  fallbackUrl?: string,
  options: SSEOptions = {}
): SSEResponse<T> {
  const {
    enabled = true,
    fallbackInterval = 30000,
    retryAttempts = 3,
    retryDelay = 2000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const fetchFallbackData = async () => {
    if (!fallbackUrl) return;
    
    try {
      const response = await fetch(fallbackUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Fallback fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Fallback fetch failed');
    }
  };

  const startFallbackPolling = () => {
    // Fetch immediately
    fetchFallbackData();
    
    // Set up interval
    fallbackTimerRef.current = setInterval(fetchFallbackData, fallbackInterval);
  };

  const connectSSE = () => {
    if (!enabled || !url) return;

    setIsLoading(true);
    setError(null);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened:', url);
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        retryCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          setData(result);
          setLastUpdate(new Date());
          setError(null);
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
          setError('Failed to parse server data');
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setIsConnected(false);
        setError('Connection lost');
        
        eventSource.close();
        eventSourceRef.current = null;

        // Retry logic
        if (retryCountRef.current < retryAttempts) {
          retryCountRef.current++;
          console.log(`Retrying SSE connection (${retryCountRef.current}/${retryAttempts}) in ${retryDelay}ms`);
          
          retryTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, retryDelay);
        } else {
          console.log('Max retry attempts reached, falling back to polling');
          setIsLoading(false);
          
          // Fall back to polling if available
          if (fallbackUrl) {
            startFallbackPolling();
          }
        }
      };

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setIsConnected(false);
      setIsLoading(false);
      setError('Failed to establish connection');
      
      // Fall back to polling immediately if SSE creation fails
      if (fallbackUrl) {
        startFallbackPolling();
      }
    }
  };

  const retry = () => {
    cleanup();
    retryCountRef.current = 0;
    connectSSE();
  };

  useEffect(() => {
    if (enabled) {
      connectSSE();
    }

    return cleanup;
  }, [url, enabled]);

  return {
    data,
    isConnected,
    isLoading,
    error,
    lastUpdate,
    retry
  };
}