export interface ScrollAreaProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function ScrollArea({ children, style, className }: ScrollAreaProps) {
  return (
    <div 
      className={className} 
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        ...style
      }}
    >
      {children}
    </div>
  );
}