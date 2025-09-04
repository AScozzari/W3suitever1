import { useState, createContext, useContext, ReactNode } from 'react';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Tabs({ value, onValueChange, children, style }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div style={style}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: ReactNode;
  style?: React.CSSProperties;
}

export function TabsList({ children, style }: TabsListProps) {
  return (
    <div style={style}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function TabsTrigger({ value: triggerValue, children, style }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { value, onValueChange } = context;
  
  return (
    <button
      onClick={() => onValueChange(triggerValue)}
      style={style}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function TabsContent({ value: contentValue, children, style }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { value } = context;
  
  if (value !== contentValue) return null;
  
  return (
    <div style={style}>
      {children}
    </div>
  );
}