"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

interface TableNodeData {
  id: number;
  name: string;
  shape: string;
  capacity: number;
  guestCount: number;
  guests: Array<{
    id: number;
    firstName: string;
    lastName: string | null;
  }>;
  color: string;
}

function TableNodeComponent({ data, selected }: NodeProps<TableNodeData>) {
  const { name, shape, capacity, guestCount, guests, color } = data;
  const isFull = guestCount >= capacity;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center border-2 shadow-lg transition-all cursor-pointer",
        shape === "round" ? "rounded-full" : "rounded-lg",
        selected ? "border-primary ring-2 ring-primary/20" : "border-gray-300",
        isFull ? "bg-green-50" : "bg-white"
      )}
      style={{
        width: shape === "round" ? 120 : 160,
        height: shape === "round" ? 120 : 100,
        backgroundColor: color || "#ffffff",
      }}
    >
      <div className="font-semibold text-sm">{name}</div>
      
      <div className={cn(
        "text-xs",
        isFull ? "text-green-600" : "text-muted-foreground"
      )}>
        {guestCount}/{capacity}
      </div>

      <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-[100px]">
        {guests.slice(0, 6).map((g) => (
          <div
            key={g.id}
            className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center text-[10px] text-white font-medium"
            title={`${g.firstName} ${g.lastName || ""}`}
          >
            {g.firstName.charAt(0)}
          </div>
        ))}
        {guests.length > 6 && (
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">
            +{guests.length - 6}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-full !h-full !top-0 !left-0 !transform-none !rounded-full"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
