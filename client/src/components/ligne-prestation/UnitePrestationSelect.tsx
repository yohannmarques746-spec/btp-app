import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNITE_OPTION_GROUPS } from "@/constants/unitesPrestation";
import { cn } from "@/lib/utils";

export interface UnitePrestationSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function UnitePrestationSelect({ value, onChange, className }: UnitePrestationSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("bg-black/20 border-white/10 text-white", className)}>
        <SelectValue placeholder="Unité" />
      </SelectTrigger>
      <SelectContent>
        {UNITE_OPTION_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.code} — {opt.libelle}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
