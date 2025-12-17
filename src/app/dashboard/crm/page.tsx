import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  RiAddLine,
  RiMailLine,
  RiPhoneLine,
  RiMoreLine,
} from "@remixicon/react";

const pipelineStages = [
  {
    id: "lead",
    name: "Leads",
    color: "bg-blue-500",
    contacts: [
      {
        id: "1",
        name: "María González",
        email: "maria@email.com",
        phone: "+34 612 345 678",
        eventDate: "2025-06-15",
        budget: 30000,
        source: "Instagram",
      },
      {
        id: "2",
        name: "Carlos Ruiz",
        email: "carlos@email.com",
        phone: "+34 623 456 789",
        eventDate: "2025-08-20",
        budget: 45000,
        source: "Referido",
      },
    ],
  },
  {
    id: "contacted",
    name: "Contactados",
    color: "bg-yellow-500",
    contacts: [
      {
        id: "3",
        name: "Ana Martínez",
        email: "ana@email.com",
        phone: "+34 634 567 890",
        eventDate: "2025-05-10",
        budget: 25000,
        source: "Web",
      },
    ],
  },
  {
    id: "proposal",
    name: "Propuesta Enviada",
    color: "bg-purple-500",
    contacts: [
      {
        id: "4",
        name: "Laura Fernández",
        email: "laura@email.com",
        phone: "+34 645 678 901",
        eventDate: "2025-04-22",
        budget: 35000,
        source: "Feria Bodas",
      },
      {
        id: "5",
        name: "Pedro Sánchez",
        email: "pedro@email.com",
        phone: "+34 656 789 012",
        eventDate: "2025-07-18",
        budget: 28000,
        source: "Google",
      },
    ],
  },
  {
    id: "negotiation",
    name: "Negociación",
    color: "bg-orange-500",
    contacts: [
      {
        id: "6",
        name: "Elena Torres",
        email: "elena@email.com",
        phone: "+34 667 890 123",
        eventDate: "2025-03-28",
        budget: 40000,
        source: "Referido",
      },
    ],
  },
  {
    id: "won",
    name: "Ganados",
    color: "bg-green-500",
    contacts: [
      {
        id: "7",
        name: "Diego López",
        email: "diego@email.com",
        phone: "+34 678 901 234",
        eventDate: "2025-03-15",
        budget: 32000,
        source: "Instagram",
      },
    ],
  },
];

export default function CRMPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM - Pipeline de Ventas</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona tus leads y clientes potenciales
          </p>
        </div>
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {pipelineStages.map((stage) => (
          <Card key={stage.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                <span className="text-sm font-medium">{stage.name}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{stage.contacts.length}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                $
                {stage.contacts
                  .reduce((sum, c) => sum + c.budget, 0)
                  .toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => (
          <div key={stage.id} className="min-w-[300px] flex-shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                <h3 className="font-semibold">{stage.name}</h3>
                <Badge variant="secondary" className="ml-1">
                  {stage.contacts.length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <RiAddLine className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {stage.contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--primary)] hover:-translate-y-1 animate-fade-in"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-[var(--primary)] text-white text-sm">
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {contact.source}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <RiMoreLine className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <RiMailLine className="h-3.5 w-3.5" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <RiPhoneLine className="h-3.5 w-3.5" />
                        <span>{contact.phone}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {new Date(contact.eventDate).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span className="text-sm font-semibold text-[var(--primary)]">
                        ${contact.budget.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
