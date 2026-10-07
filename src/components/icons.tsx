type IconProps = { className?: string };

function base(path: string, className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return base("M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z", className);
}

export function IconGrid({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return base("M12 5v14M5 12h14", className);
}

export function IconCompare({ className }: IconProps) {
  return base("M8 6v12M16 6v12M4 9h8M12 15h8", className);
}

export function IconSliders({ className }: IconProps) {
  return base("M4 7h16M4 12h16M4 17h16M8 7v.01M14 12v.01M10 17v.01", className);
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path d="M20 19a3 3 0 0 0-2-2.8M4 19a3 3 0 0 1 2-2.8M17 8a2.5 2.5 0 1 0-5 0M7 8a2.5 2.5 0 1 0-5 0" />
    </svg>
  );
}

export function IconBack({ className }: IconProps) {
  return base("M15 6 9 12l6 6", className);
}
