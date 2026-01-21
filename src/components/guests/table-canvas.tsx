"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  Panel,
  Node,
  NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { TableNode } from "./table-node";
import { GuestSidebar } from "./guest-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiAddLine } from "@remixicon/react";

interface TableData {
  id: number;
  name: string;
  shape: string;
  capacity: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  color: string;
  guestCount: number;
  guests: Array<{
    id: number;
    firstName: string;
    lastName: string | null;
    ageGroup: string | null;
    menuPreference: string | null;
  }>;
}

interface Guest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  tableId: number | null;
  tableName: string | null;
  rsvpStatus: string | null;
  groupName: string | null;
}

interface TableCanvasProps {
  eventId: number;
  tables: TableData[];
  guests: Guest[];
  onRefresh: () => void;
}

const nodeTypes = {
  table: TableNode,
};

const tableTemplates = [
  { name: "Redonda (6)", shape: "round", capacity: 6, width: 100, height: 100 },
  { name: "Redonda (8)", shape: "round", capacity: 8, width: 120, height: 120 },
  { name: "Redonda (10)", shape: "round", capacity: 10, width: 140, height: 140 },
  { name: "Rectangular (8)", shape: "rectangular", capacity: 8, width: 200, height: 80 },
  { name: "Presidencial (12)", shape: "rectangular", capacity: 12, width: 300, height: 60 },
];

export function TableCanvas({ eventId, tables, guests, onRefresh }: TableCanvasProps) {
  const [tableCounter, setTableCounter] = useState(tables.length + 1);

  const initialNodes: Node[] = useMemo(() => 
    tables.map((t) => ({
      id: `table-${t.id}`,
      type: "table",
      position: { x: t.positionX, y: t.positionY },
      data: {
        id: t.id,
        name: t.name,
        shape: t.shape,
        capacity: t.capacity,
        guestCount: t.guestCount,
        guests: t.guests,
        color: t.color,
      },
    })),
    [tables]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Sync nodes when tables change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleNodeDragStop = useCallback(async (_event: React.MouseEvent, node: Node) => {
    const tableId = node.id.replace("table-", "");
    try {
      await fetch(`/api/events/${eventId}/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
        }),
      });
    } catch (error) {
      console.error("Failed to update table position:", error);
    }
  }, [eventId]);

  const handleAddTable = async (template: typeof tableTemplates[0]) => {
    const name = `Mesa ${tableCounter}`;
    setTableCounter((c) => c + 1);

    try {
      const res = await fetch(`/api/events/${eventId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shape: template.shape,
          capacity: template.capacity,
          width: template.width,
          height: template.height,
          positionX: 100 + (tableCounter % 5) * 150,
          positionY: 100 + Math.floor(tableCounter / 5) * 150,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to create table:", error);
    }
  };

  const handleAssignGuest = async (guestId: number, tableId: number) => {
    try {
      await fetch(`/api/events/${eventId}/tables/${tableId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });
      onRefresh();
    } catch (error) {
      console.error("Failed to assign guest:", error);
    }
  };

  const _handleRemoveGuest = async (guestId: number, tableId: number) => {
    try {
      await fetch(`/api/events/${eventId}/tables/${tableId}/assign?guestId=${guestId}`, {
        method: "DELETE",
      });
      onRefresh();
    } catch (error) {
      console.error("Failed to remove guest:", error);
    }
  };
  void _handleRemoveGuest;

  const unseatedGuests = guests.filter((g) => !g.tableId);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-white">
      <GuestSidebar
        guests={unseatedGuests}
        onAssign={handleAssignGuest}
        tables={tables}
      />

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onNodeDragStop={handleNodeDragStop}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          minZoom={0.5}
          maxZoom={2}
        >
          <Background gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={() => "#10b981"}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Panel position="top-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <RiAddLine className="h-4 w-4" />
                  Añadir Mesa
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {tableTemplates.map((template) => (
                  <DropdownMenuItem
                    key={template.name}
                    onClick={() => handleAddTable(template)}
                  >
                    {template.shape === "round" ? "⚪" : "▭"} {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
