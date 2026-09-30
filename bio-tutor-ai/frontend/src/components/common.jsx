import { Loader2 } from "lucide-react";

export function Page({ title, subtitle, actions, children, testid }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-fade-up" data-testid={testid}>
      {(title || actions || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/50">
          <div>
            {subtitle && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary mb-1.5">
                {subtitle}
              </span>
            )}
            {title && (
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
            )}
          </div>
          {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card text-card-foreground p-5 lg:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return <Loader2 className={`h-5 w-5 animate-spin text-primary ${className}`} />;
}

export function EmptyState({ icon: Icon, title, description, action, testid }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center shadow-sm"
      data-testid={testid}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

