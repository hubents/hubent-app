import { cn } from "@/lib/utils";

interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

function Table<T extends Record<string, unknown>>({ 
  data, 
  columns, 
  className,
  striped = false,
  hoverable = true 
}: TableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
            {columns.map((column, i) => (
              <th 
                key={i} 
                className={cn(
                  "px-4 py-3 text-left font-medium text-[var(--muted-foreground)]",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr 
              key={rowIndex}
              className={cn(
                "border-b border-[var(--border)] last:border-0 transition-colors",
                striped && rowIndex % 2 === 1 && "bg-[var(--muted)]/30",
                hoverable && "hover:bg-[var(--muted)]/50"
              )}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className={cn("px-4 py-3", column.className)}>
                  {column.render 
                    ? column.render(item) 
                    : String(item[column.key as keyof T] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Table };
export type { TableColumn };
