"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUserSession } from "@/hooks/use-user-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiBuilding2Line,
  RiArrowLeftLine,
  RiFileTextLine,
  RiFileList2Line,
  RiMoneyDollarCircleLine,
  RiFileDownloadLine,
  RiAddLine,
  RiTaskLine,
  RiListOrdered2,
  RiInformationLine,
  RiSurveyLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/file-download";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { downloadPDFFromHTML } from "@/lib/pdf-download";

type TabKey = "documents" | "payments" | "tasks" | "runsheet" | "forms";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "tasks", label: "Mis Tareas", icon: RiTaskLine },
  { key: "forms", label: "Formularios", icon: RiSurveyLine },
  { key: "runsheet", label: "Orden del día", icon: RiListOrdered2 },
  { key: "documents", label: "Documentos", icon: RiFileTextLine },
  { key: "payments", label: "Pagos", icon: RiMoneyDollarCircleLine },
];

interface RunSheetItem {
  id: number;
  taskId: number;
  vendorId: number | null;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  taskTitle: string;
  vendorName: string | null;
  source: string;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  dueDate: string | null;
  createdAt: string;
}

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "En progreso", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-700" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Media", color: "bg-blue-100 text-blue-600" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-600" },
};

interface EventDetail {
  accessId: number;
  status: string | null;
  eventId: number;
  eventName: string;
  eventDate: string | null;
  eventEndDate: string | null;
  eventStatus: string | null;
  eventLocation: string | null;
  plannerOrgName: string;
  plannerOrgLogo: string | null;
}

interface Document {
  id: number;
  type: string;
  number: string;
  status: string;
  direction: string | null;
  issueDate: string | null;
  dueDate: string | null;
  total: string;
  paidAmount: string | null;
  currency: string;
  sourceDocumentId: number | null;
  createdAt: string;
}

interface Payment {
  id: number;
  documentId: number | null;
  amount: string;
  currency: string;
  direction: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  sourcePaymentId: number | null;
  documentNumber: string | null;
  documentType: string | null;
  createdAt: string;
}

const docStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  payment_promise: { label: "Promesa de pago", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Vencido", color: "bg-orange-100 text-orange-700" },
};

const docTypeLabels: Record<string, string> = {
  quote: "Presupuesto",
  proforma: "Proforma",
  invoice: "Factura",
  delivery_note: "Albarán",
  credit_note: "F. Rectificativa",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  stripe: "Stripe",
  other: "Otro",
};

export default function VendorEventDetailPage({ params }: { params: Promise<{ accessId: string }> }) {
  const { accessId } = use(params);
  const router = useRouter();
  const { can } = useUserSession();
  const canCreateDocs = can("finance:create");
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [eventTasks, setEventTasks] = useState<Task[]>([]);
  const [runSheetItems, setRunSheetItems] = useState<RunSheetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [accessId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [eventsRes, docsRes, paymentsRes, tasksRes, runSheetRes] = await Promise.all([
        fetch("/api/vendor/events"),
        fetch(`/api/vendor/events/${accessId}/documents`),
        fetch(`/api/vendor/events/${accessId}/payments`),
        fetch(`/api/vendor/events/${accessId}/tasks`),
        fetch(`/api/vendor/events/${accessId}/run-sheet`),
      ]);

      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        const event = eventsData.data.find((e: any) => e.accessId === parseInt(accessId));
        setEventDetail(event || null);
      }

      const docsData = await docsRes.json();
      if (docsData.success) setDocuments(docsData.data || []);

      const paymentsData = await paymentsRes.json();
      if (paymentsData.success) setPayments(paymentsData.data || []);

      const tasksData = await tasksRes.json();
      if (tasksData.success) setEventTasks(tasksData.data || []);

      const runSheetData = await runSheetRes.json();
      if (runSheetData.success) setRunSheetItems(runSheetData.data || []);
    } catch (error) {
      console.error("Error loading event detail:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createQuickDocument(type: "quote" | "invoice") {
    try {
      const res = await fetch(`/api/vendor/events/${accessId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          items: [{ description: "Servicio", quantity: 1, unitPrice: 0, taxRate: 21 }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${type === "quote" ? "Presupuesto" : "Factura"} creado`);
        loadAll();
      } else {
        toast.error(data.error?.message || "Error al crear documento");
      }
    } catch {
      toast.error("Error al crear documento");
    }
  }

  const formatCurrency = (amount: string, currency = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(parseFloat(amount || "0"));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!eventDetail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/vendor/events")}>
          <RiArrowLeftLine className="h-4 w-4 mr-2" />
          Volver a eventos
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Evento no encontrado
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats
  const totalDocs = documents.length;
  const totalQuotes = documents.filter((d) => d.type === "quote").length;
  const totalInvoices = documents.filter((d) => d.type === "invoice").length;
  const totalPaymentAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/vendor/events")}>
          <RiArrowLeftLine className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{eventDetail.eventName}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <RiBuilding2Line className="h-3.5 w-3.5" />
              {eventDetail.plannerOrgName}
            </span>
            {eventDetail.eventDate && (
              <span className="flex items-center gap-1">
                <RiTimeLine className="h-3.5 w-3.5" />
                {format(new Date(eventDetail.eventDate), "dd MMMM yyyy", { locale: es })}
              </span>
            )}
            {eventDetail.eventLocation && (
              <span className="flex items-center gap-1">
                <RiMapPinLine className="h-3.5 w-3.5" />
                {eventDetail.eventLocation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Documentos</p>
            <p className="text-2xl font-bold">{totalDocs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Presupuestos</p>
            <p className="text-2xl font-bold">{totalQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Facturas</p>
            <p className="text-2xl font-bold">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Pagos recibidos</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPaymentAmount.toString())}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "documents" && (
        <>
        {canCreateDocs && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => createQuickDocument("quote")}>
            <RiAddLine className="h-4 w-4 mr-1" />
            Nuevo Presupuesto
          </Button>
          <Button size="sm" variant="outline" onClick={() => createQuickDocument("invoice")}>
            <RiAddLine className="h-4 w-4 mr-1" />
            Nueva Factura
          </Button>
        </div>
        )}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Sin documentos para este evento
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge variant="outline">{docTypeLabels[doc.type] || doc.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{doc.number}</TableCell>
                      <TableCell>
                        {doc.issueDate
                          ? format(new Date(doc.issueDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(doc.total, doc.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={docStatusConfig[doc.status]?.color || "bg-gray-100"}>
                          {docStatusConfig[doc.status]?.label || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.sourceDocumentId ? (
                          <Badge variant="secondary" className="text-xs">Espejo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Propio</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </>
      )}

      {activeTab === "tasks" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarea</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No tenés tareas asignadas en este evento
                    </TableCell>
                  </TableRow>
                ) : (
                  eventTasks.map((task) => {
                    const st = taskStatusConfig[task.status || "pending"] || taskStatusConfig.pending;
                    const pr = priorityConfig[task.priority || "medium"] || priorityConfig.medium;
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {task.category || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={pr.color}>{pr.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {task.dueDate
                            ? format(new Date(task.dueDate), "dd MMM yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={st.color}>{st.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "forms" && (
        <VendorFormsTab accessId={accessId} />
      )}

      {activeTab === "runsheet" && (
        <VendorRunSheetTab
          items={runSheetItems}
          onDownload={async () => {
            const eventName = eventDetail?.eventName?.replace(/\s+/g, "-").toLowerCase() || "evento";
            await downloadPDFFromHTML(
              `/api/vendor/events/${accessId}/run-sheet/pdf`,
              `orden-del-dia-${eventName}`
            );
          }}
        />
      )}

      {activeTab === "payments" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Sin pagos para este evento
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.paymentDate
                          ? format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.documentNumber
                          ? `${docTypeLabels[payment.documentType || ""] || ""} ${payment.documentNumber}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {paymentMethodLabels[payment.paymentMethod || ""] || payment.paymentMethod || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={payment.status === "complete" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                          {payment.status === "complete" ? "Completo" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.attachmentUrl ? (
                          <button onClick={() => downloadFile(payment.attachmentUrl!, payment.attachmentName || "comprobante")} className="text-primary hover:underline text-sm flex items-center gap-1">
                            <RiFileDownloadLine className="h-3.5 w-3.5" />
                            {payment.attachmentName || "Descargar"}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// VendorRunSheetTab - Timeline view for provider
// ============================================

function VendorRunSheetTab({
  items,
  onDownload,
}: {
  items: RunSheetItem[];
  onDownload: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  // Group by date
  const itemsByDate = items.reduce<Record<string, RunSheetItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  Object.values(itemsByDate).forEach((dateItems) => {
    dateItems.sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  });

  const sortedDates = Object.keys(itemsByDate).sort();

  return (
    <div className="space-y-4">
      {/* Download button */}
      {items.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={async () => {
              setDownloading(true);
              try { await onDownload(); } finally { setDownloading(false); }
            }}
            disabled={downloading}
          >
            <RiFileDownloadLine className="h-4 w-4 mr-1" />
            {downloading ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiListOrdered2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No hay items en la orden del día</p>
            <p className="text-xs text-muted-foreground mt-1">
              El organizador aún no ha cargado la orden del día para tus tareas
            </p>
          </CardContent>
        </Card>
      ) : (
        sortedDates.map((dateKey) => {
          const dateItems = itemsByDate[dateKey];
          const dateObj = new Date(dateKey + "T12:00:00");

          return (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs font-medium">
                  {format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {dateItems.length} {dateItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {dateItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3">
                        {/* Time */}
                        <div className="w-20 shrink-0 text-right">
                          {item.startTime ? (
                            <div>
                              <span className="text-sm font-semibold">{item.startTime}</span>
                              {item.endTime && (
                                <span className="text-xs text-muted-foreground block">
                                  → {item.endTime}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin hora</span>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="w-0.5 h-10 rounded-full bg-amber-400 shrink-0 mt-0.5" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.title}</span>
                            <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#f59e0b", color: "#d97706" }}>
                              {item.taskTitle}
                            </Badge>
                            {item.vendorName && (
                              <Badge variant="secondary" className="text-[10px] gap-0.5">
                                {item.vendorName}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {item.location && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <RiMapPinLine className="h-3 w-3" />
                                {item.location}
                              </span>
                            )}
                            {item.notes && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <RiInformationLine className="h-3 w-3" />
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}

interface VendorFormItem {
  id: number;
  formName: string;
  formDescription: string | null;
  taskId: number | null;
  status: string;
}

function VendorFormsTab({ accessId }: { accessId: string }) {
  const [formsList, setFormsList] = useState<VendorFormItem[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [vendorFormData, setVendorFormData] = useState<{
    instanceId: number;
    form: {
      name: string;
      description: string | null;
      primaryColor: string;
      submitButtonText: string;
      thankYouTitle: string;
      thankYouMessage: string;
      gdprEnabled: boolean;
      gdprText: string;
      gdprLink: string | null;
      fields: { id: number; type: string; label: string; placeholder: string | null; required: boolean; options: unknown; sortOrder: number }[];
    };
  } | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [vendorGdprAccepted, setVendorGdprAccepted] = useState(false);

  useEffect(() => {
    async function loadForms() {
      try {
        const res = await fetch(`/api/vendor/events/${accessId}/forms`);
        const data = await res.json();
        if (data.success) setFormsList(data.data);
      } catch {
        // silent
      } finally {
        setLoadingForms(false);
      }
    }
    loadForms();
  }, [accessId]);

  const openForm = async (instanceId: number) => {
    setSelectedFormId(instanceId);
    setVendorFormData(null);
    setFormValues({});
    setHasSubmitted(false);
    try {
      const res = await fetch(`/api/vendor/forms/${instanceId}`);
      const data = await res.json();
      if (data.success) setVendorFormData(data.data);
    } catch {
      // silent
    }
  };

  const submitVendorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorFormData || !selectedFormId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vendor/forms/${selectedFormId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formValues }),
      });
      const data = await res.json();
      if (data.success) {
        setHasSubmitted(true);
        toast.success("Formulario enviado correctamente");
      } else {
        toast.error(data.error || "Error al enviar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingForms) {
    return (
      <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
    );
  }

  if (formsList.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <RiSurveyLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay formularios asignados para este evento.</p>
        </CardContent>
      </Card>
    );
  }

  if (hasSubmitted && vendorFormData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <RiSurveyLine className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">{vendorFormData.form.thankYouTitle || "¡Gracias!"}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {vendorFormData.form.thankYouMessage || "Tu respuesta ha sido registrada."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => { setSelectedFormId(null); setVendorFormData(null); setHasSubmitted(false); }}>
            Volver a formularios
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (selectedFormId && vendorFormData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedFormId(null); setVendorFormData(null); }}>
              <RiArrowLeftLine className="h-4 w-4 mr-1" /> Volver
            </Button>
          </div>
          <h3 className="text-lg font-semibold">{vendorFormData.form.name}</h3>
          {vendorFormData.form.description && (
            <p className="text-sm text-muted-foreground mt-1">{vendorFormData.form.description}</p>
          )}
          <form onSubmit={submitVendorForm} className="mt-6 space-y-4 max-w-lg">
            {vendorFormData.form.fields.map((field) => (
              <VendorFieldRenderer
                key={field.id}
                field={field}
                value={formValues[field.label]}
                onChange={(val) => setFormValues((prev) => ({ ...prev, [field.label]: val }))}
              />
            ))}
            {vendorFormData.form.gdprEnabled && (
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={vendorGdprAccepted} onChange={(e) => setVendorGdprAccepted(e.target.checked)} className="mt-1" />
                <span className="text-sm text-muted-foreground">
                  {vendorFormData.form.gdprText}
                  {vendorFormData.form.gdprLink && (
                    <a href={vendorFormData.form.gdprLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">Ver política</a>
                  )}
                </span>
              </div>
            )}
            <Button type="submit" disabled={isSubmitting || (vendorFormData.form.gdprEnabled && !vendorGdprAccepted)} style={{ backgroundColor: vendorFormData.form.primaryColor }}>
              {isSubmitting ? "Enviando..." : vendorFormData.form.submitButtonText || "Enviar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {formsList.map((form) => (
        <Card key={form.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openForm(form.id)}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">{form.formName}</h4>
              {form.formDescription && <p className="text-sm text-muted-foreground mt-0.5">{form.formDescription}</p>}
            </div>
            <Badge variant="outline">Completar</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VendorFieldRenderer({ field, value, onChange }: {
  field: { id: number; type: string; label: string; placeholder: string | null; required: boolean; options: unknown };
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (field.type === "section_title") return <h3 className="text-base font-semibold pt-2">{field.label}</h3>;
  if (field.type === "descriptive_text") return <p className="text-sm text-muted-foreground">{field.label}</p>;
  if (field.type === "separator") return <hr className="border-border" />;

  const isTextArea = field.type === "message" || field.type === "long_text";
  const inputType = field.type === "email" || field.type === "partner_email" ? "email" : field.type === "phone" ? "tel" : field.type === "event_date" ? "date" : "text";

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {isTextArea ? (
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <input
          type={inputType}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          required={field.required}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
    </div>
  );
}
