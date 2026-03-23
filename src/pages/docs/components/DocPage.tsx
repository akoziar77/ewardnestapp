import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

export function DocPage({ title, description, children }: Props) {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>}
      </header>
      <div className="prose prose-sm max-w-none text-foreground
        prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground">
        {children}
      </div>
    </article>
  );
}
