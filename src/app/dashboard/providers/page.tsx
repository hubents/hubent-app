"use client";

import { useEffect, useState, useCallback } from "react";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiStoreLine,
  RiSearchLine,
  RiInstagramLine,
  RiMapPinLine,
  RiShieldCheckLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import Link from "next/link";
import { PROVIDER_CATEGORIES, PLANNER_CATEGORIES, getOrgTypeLabel } from "@/config/provider-constants";

interface PartnersDirectoryOrg {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  tagline: string | null;
  city: string | null;
  region: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  phone: string | null;
  website: string | null;
}

const ALL_CATEGORIES = [...new Set([...PROVIDER_CATEGORIES, ...PLANNER_CATEGORIES])].sort();

export default function ProvidersDirectoryPage() {
  return <EventScopedGuard><ProvidersDirectoryContent /></EventScopedGuard>;
}

function ProvidersDirectoryContent() {
  const [orgs, setOrgs] = useState<PartnersDirectoryOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (typeFilter) params.set("type", typeFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrgs(data.data);
        setTotal(data.meta?.total ?? data.data.length);
      }
    } catch {
      console.error("Error fetching Partners directory");
    } finally {
      setLoading(false);
    }
  }, [search, category, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(timer);
  }, [fetchOrgs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partners</h1>
        <p className="text-muted-foreground">
          Proveedores y planificadores verificados en la plataforma
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o Instagram..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="provider">Proveedores</SelectItem>
            <SelectItem value="planner">Planificadores</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiStoreLine className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No se encontraron resultados</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || category || typeFilter
                ? "Intenta con otros filtros de búsqueda"
                : "Aún no hay organizaciones verificadas en la plataforma"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} resultados encontrados</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs.map((org) => {
              const location = [org.city, org.region].filter(Boolean).join(", ");
              return (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${org.orgType === "provider" ? "bg-purple-100" : "bg-blue-100"}`}>
                        <RiStoreLine className={`h-6 w-6 ${org.orgType === "provider" ? "text-purple-600" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{org.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5">
                          <RiShieldCheckLine className="h-3 w-3 text-green-600" />
                          Verificado
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={org.orgType === "provider" ? "default" : "secondary"} className="text-xs">
                        {getOrgTypeLabel(org.orgType)}
                      </Badge>
                      {org.providerCategory && (
                        <Badge variant="outline">{org.providerCategory}</Badge>
                      )}
                      {location && (
                        <Badge variant="outline" className="gap-1">
                          <RiMapPinLine className="h-3 w-3" />
                          {location}
                        </Badge>
                      )}
                    </div>

                    {org.tagline && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{org.tagline}</p>
                    )}

                    {org.instagramHandle && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <RiInstagramLine className="h-3.5 w-3.5" />
                        @{org.instagramHandle}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/providers/${org.slug}`} target="_blank">
                          <RiExternalLinkLine className="h-3.5 w-3.5 mr-1" />
                          Ver Perfil
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
