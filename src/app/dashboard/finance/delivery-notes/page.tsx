"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiAddLine,
  RiSearchLine,
  RiTruckLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DeliveryNote {
  id: number;
  number: string;
  status: string;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  issueDate: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-700" },
};

export default function DeliveryNotesPage() {
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchNotes();
  }, [statusFilter]);

  async function fetchNotes() {
    try {
      const params = new URLSearchParams({
        type: "delivery_note",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotes(data.data || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch delivery notes:", error);
      toast.error("Error al cargar albaranes");
    } finally {
      setLoading(false);
    }
  }

  const getClientName = (note: DeliveryNote) => {
    if (note.companyName) return note.companyName;
    if (note.personFirstName) {
      return `${note.personFirstName} ${note.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  const filteredNotes = notes.filter((n) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      n.number.toLowerCase().includes(search) ||
      getClientName(n).toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Albaranes</h1>
          <p className="text-muted-foreground">
            Notas de entrega de productos y servicios
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/finance/delivery-notes/new">
            <RiAddLine className="mr-2 h-4 w-4" />
            Nuevo Albarán
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <RiTruckLine className="h-8 w-8" />
                      <p>No hay albaranes</p>
                      <p className="text-sm">
                        Los albaranes se crean desde las facturas
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/finance/delivery-notes/${note.id}`}
                        className="hover:underline"
                      >
                        {note.number}
                      </Link>
                    </TableCell>
                    <TableCell>{getClientName(note)}</TableCell>
                    <TableCell>
                      {note.issueDate
                        ? format(new Date(note.issueDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[note.status]?.color || "bg-gray-100"}>
                        {statusConfig[note.status]?.label || note.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
