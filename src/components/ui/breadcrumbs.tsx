import { cn } from "@/lib/utils";
import { RiArrowRightSLine, RiHomeLine } from "@remixicon/react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

const Breadcrumbs = ({ 
  items, 
  className, 
  separator = <RiArrowRightSLine className="h-4 w-4 text-[var(--muted-foreground)]" />,
  showHome = true 
}: BreadcrumbsProps) => {
  const allItems = showHome 
    ? [{ label: "Home", href: "/", icon: <RiHomeLine className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ) : (
                <span className={cn(
                  "flex items-center gap-1.5 text-sm",
                  isLast ? "font-medium text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                )}>
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}
              {!isLast && separator}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumbs };
export type { BreadcrumbItem };
