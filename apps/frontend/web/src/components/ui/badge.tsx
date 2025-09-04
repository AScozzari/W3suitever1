export interface BadgeProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Badge({ children, style, className }: BadgeProps) {
  return (
    <span className={className} style={style}>
      {children}
    </span>
  );
}