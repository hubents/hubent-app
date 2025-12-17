import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";

interface ProfileCardProps {
  name: string;
  role?: string;
  avatar?: string;
  coverImage?: string;
  stats?: { label: string; value: string | number }[];
  badges?: string[];
  onFollow?: () => void;
  onMessage?: () => void;
  className?: string;
}

const ProfileCard = ({
  name,
  role,
  avatar,
  coverImage,
  stats,
  badges,
  onFollow,
  onMessage,
  className,
}: ProfileCardProps) => {
  return (
    <div className={cn(
      "overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]",
      className
    )}>
      {/* Cover Image */}
      {coverImage ? (
        <div 
          className="h-24 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
      ) : (
        <div className="h-24 animate-gradient" />
      )}

      {/* Avatar */}
      <div className="relative px-4">
        <div className="absolute -top-8">
          <Avatar className="h-16 w-16 ring-4 ring-[var(--card)]">
            {avatar ? (
              <AvatarImage src={avatar} alt={name} />
            ) : (
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-10">
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{name}</h3>
          {role && <p className="text-sm text-[var(--muted-foreground)]">{role}</p>}
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {badges.map((badge, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{badge}</Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="mb-4 flex gap-4 border-y border-[var(--border)] py-3">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {(onFollow || onMessage) && (
          <div className="flex gap-2">
            {onFollow && (
              <Button onClick={onFollow} className="flex-1">
                Follow
              </Button>
            )}
            {onMessage && (
              <Button onClick={onMessage} variant="outline" className="flex-1">
                Message
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { ProfileCard };
