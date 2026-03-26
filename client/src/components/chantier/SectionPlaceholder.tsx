import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface SectionPlaceholderProps {
  title: string;
  icon: ReactNode;
  sectionNumber: number;
}

export function SectionPlaceholder({ title, icon, sectionNumber }: SectionPlaceholderProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-white/80">{icon}</span>
          <h3 className="text-base font-semibold text-white sm:text-lg">{title}</h3>
        </div>
        <Badge className="bg-white/10 text-white/80 border border-white/20">
          A implementer - Section {sectionNumber}
        </Badge>
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-black/10 p-4 text-sm text-white/50">
        Contenu de la section {sectionNumber} a implementer apres validation.
      </div>
    </section>
  );
}

