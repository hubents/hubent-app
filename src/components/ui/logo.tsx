import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "isotipo";
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  className?: string;
  showText?: boolean;
}

const sizes = {
  sm: { logo: 24, isotipo: 24 },
  md: { logo: 32, isotipo: 32 },
  lg: { logo: 48, isotipo: 48 },
};

export function Logo({
  variant = "full",
  size = "md",
  theme = "light",
  className,
  showText = true,
}: LogoProps) {
  const isDark = theme === "dark";
  
  const logoSrc = variant === "full"
    ? isDark ? "/images/logo-light.png" : "/images/logo-dark.png"
    : isDark ? "/images/isotipo-light.png" : "/images/isotipo-dark.png";

  const dimensions = sizes[size];

  if (variant === "full") {
    return (
      <Image
        src={logoSrc}
        alt="Hubents"
        width={dimensions.logo * 4}
        height={dimensions.logo}
        className={cn("h-auto", className)}
        style={{ width: "auto", height: dimensions.logo }}
        priority
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src={logoSrc}
        alt="Hubents"
        width={dimensions.isotipo}
        height={dimensions.isotipo}
        className="flex-shrink-0"
        priority
      />
      {showText && (
        <span className={cn(
          "font-bold",
          size === "sm" && "text-lg",
          size === "md" && "text-xl",
          size === "lg" && "text-2xl",
        )}>
          hubents
        </span>
      )}
    </div>
  );
}
