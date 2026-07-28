/** Auros section eyebrow: a 6px teal dot + tracked uppercase label. */
export default function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}
