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
        "rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">
          {eyebrow}
        </p>
        <h2 className="text-lg font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.label}
            className="rounded-lg border border-blue-100 bg-white p-3"
          >
            <div className="mb-2 inline-flex h-7 items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 text-[11px] font-bold text-blue-700">
              {step.label}
            </div>
            <h3 className="text-sm font-bold text-slate-950">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{step.body}</p>
          </article>
        ))}
      </div>

      {tip ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {tip}
        </div>
      ) : null}
    </section>
  );
}
