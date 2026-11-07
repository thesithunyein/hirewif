export function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const paths: Record<string, JSX.Element> = {
    research: (
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm1 4v5l4 2-1 1.7-5-2.5V8h2z" />
    ),
    monitor: (
      <path d="M4 6h16v10H4V6zm2 2v6h12V8H6zm-2 10h16v2H4v-2z" />
    ),
    content: (
      <path d="M6 4h12v2H6V4zm0 4h12v2H6V8zm0 4h8v2H6v-2zm0 4h10v2H6v-2z" />
    ),
    data: (
      <path d="M4 6l8-3 8 3v12l-8 3-8-3V6zm8 1.2L6.5 9.5v8.3L12 20.5l5.5-2.7V9.5L12 7.2z" />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      {paths[name] || paths.research}
    </svg>
  );
}
