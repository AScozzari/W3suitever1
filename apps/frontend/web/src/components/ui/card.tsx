export interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, style, className, onClick }: CardProps) {
  return (
    <div className={className} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardHeader({ children, style, className }: CardProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export function CardContent({ children, style, className }: CardProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export function CardTitle({ children, style, className }: CardProps) {
  return (
    <h3 className={className} style={style}>
      {children}
    </h3>
  );
}