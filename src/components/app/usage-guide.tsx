import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type UsageStep = {
  label: string;
  title: string;
  body: string;
};

type UsageGuideProps = {
  eyebrow?: string;
  title: string;
  description: string;
  steps: UsageStep[];
  tip?: ReactNode;
  className?: string;
};

export function UsageGuide({
  eyebrow = "How to use this tab",
  title,
  description,
  steps,
  tip,
  className,
}: UsageGuideProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-4 shadow-[0_0_0_1px_rgba(56,189,248,0.04)]",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          {eyebrow}
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.label}
            className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3"
          >
            <div className="mb-2 inline-flex h-7 items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 text-[11px] font-semibold text-sky-200">
              {step.label}
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{step.body}</p>
          </article>
        ))}
      </div>

      {tip ? (
        <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.07] px-3 py-2 text-xs leading-5 text-amber-100/85">
          {tip}
        </div>
      ) : null}
    </section>
  );
}
