import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  accentClass?: string;
  onSeeAll?: () => void;
}

const SectionHeader = ({ icon, title, subtitle, accentClass = "text-gradient-gold", onSeeAll }: SectionHeaderProps) => {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary">{icon}</span>
          <h2 className={`font-display font-bold text-2xl md:text-3xl ${accentClass}`}>{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          See all <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};

export default SectionHeader;
