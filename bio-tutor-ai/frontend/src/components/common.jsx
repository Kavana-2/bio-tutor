import { Loader2 } from "lucide-react";

export function Page({ title, subtitle, actions, children, testid }) {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full animate-fade-up" data-testid={testid}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            {subtitle && <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{subtitle}</p>}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800">{title}</h1>
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`rounded-2xl border border-pink-100 bg-white p-6 transition-shadow hover:shadow-md ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-primary ${className}`} />;
}

export function EmptyState({ icon: Icon, title, description, action, testid }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-16 px-6 text-center" data-testid={testid}>
      {Icon && <Icon className="h-10 w-10 mx-auto text-muted-foreground mb-4" />}
      <h3 className="font-semibold tracking-tight">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} />;
}
