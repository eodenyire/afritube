import { TrendingUp, Users, Clock } from "lucide-react";

interface CreatorBadgeProps {
  name: string;
  avatar: string;
  subscribers: number;
  watchHours: number;
  isEligible: boolean;
  showEligibility?: boolean;
}

const CreatorBadge = ({ name, avatar, subscribers, watchHours, isEligible, showEligibility = true }: CreatorBadgeProps) => {
  const subPercent = Math.min((subscribers / 100) * 100, 100);
  const hoursPercent = Math.min((watchHours / 1000) * 100, 100);

  return (
    <div className="rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <img src={avatar} alt={name} className="w-11 h-11 rounded-full object-cover" />
        <div>
          <h4 className="font-display font-semibold text-sm text-foreground">{name}</h4>
          {showEligibility ? (
            isEligible ? (
              <span className="text-[11px] font-bold bg-gradient-gold text-primary-foreground px-2 py-0.5 rounded-full">
                ✦ MONETIZED
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Not yet eligible</span>
            )
          ) : (
            <span className="text-[11px] text-muted-foreground">Creator</span>
          )}
        </div>
      </div>
      {showEligibility ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1"><Users size={12} />Subscribers</span>
              <span className="text-foreground font-medium">{subscribers}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-gold transition-all duration-500"
                style={{ width: `${subPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1"><Clock size={12} />Watch Hours</span>
              <span className="text-foreground font-medium">{watchHours}/1,000</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-coral transition-all duration-500"
                style={{ width: `${hoursPercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Discover their latest uploads in the creator's page.</p>
      )}
    </div>
  );
};

export default CreatorBadge;
