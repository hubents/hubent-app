"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  Link2, 
  Calendar,
  Clock,
  User,
  MoreHorizontal,
  Play,
  Lock
} from "lucide-react";

// Types
interface TaskMessage {
  id: number;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  content: string;
  type: string;
  isPrivate: boolean;
  createdAt: Date;
  attachments?: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
  }>;
}

interface TaskAttachment {
  id: number;
  name: string;
  url: string;
  type: string;
  thumbnail?: string;
}

interface ScheduleItem {
  id: number;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
}

interface PaymentSchedule {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
}

interface TaskData {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: Date;
  assignedTo?: {
    id: string;
    name: string;
    image?: string;
  };
  category?: string;
  youtubeUrl?: string;
  htmlContent?: string;
}

interface TaskPanelProps {
  task: TaskData | null;
  isOpen: boolean;
  onClose: () => void;
  messages?: TaskMessage[];
  attachments?: {
    files: TaskAttachment[];
    documents: TaskAttachment[];
    images: TaskAttachment[];
    links: TaskAttachment[];
  };
  scheduleItems?: ScheduleItem[];
  paymentSchedules?: PaymentSchedule[];
  onSendMessage?: (content: string, isPrivate: boolean) => void;
  onAddAttachment?: (type: string) => void;
}

export function TaskPanel({
  task,
  isOpen,
  onClose,
  messages = [],
  attachments = { files: [], documents: [], images: [], links: [] },
  scheduleItems = [],
  paymentSchedules = [],
  onSendMessage,
  onAddAttachment,
}: TaskPanelProps) {
  const [messageInput, setMessageInput] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (messageInput.trim() && onSendMessage) {
      onSendMessage(messageInput.trim(), isPrivate);
      setMessageInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl">{task.title}</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant={task.status === "completed" ? "success" : "secondary"}>
                  {task.status}
                </Badge>
                <Badge variant="outline">{task.priority}</Badge>
                {task.category && <Badge variant="outline">{task.category}</Badge>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Task Content */}
          <div className="flex-1 flex flex-col border-r">
            <Tabs defaultValue="general" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 justify-start">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="schedule">Orden del día</TabsTrigger>
              </TabsList>

              {/* Tab: General */}
              <TabsContent value="general" className="flex-1 overflow-auto p-4 space-y-6">
                {/* Task Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Responsable</label>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignedTo?.image} />
                        <AvatarFallback>
                          {task.assignedTo?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignedTo?.name || "Sin asignar"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Categoría</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.category || "General"}</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Fecha</label>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {task.dueDate 
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "Sin fecha"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Link de YouTube</label>
                    <div className="text-sm text-muted-foreground truncate">
                      {task.youtubeUrl || "https://www.youtube.com..."}
                    </div>
                  </div>
                </div>

                {/* YouTube Video */}
                {task.youtubeUrl && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <iframe
                      src={task.youtubeUrl.replace("watch?v=", "embed/")}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* HTML Content / Instructions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Paragraph</span>
                    <Separator orientation="vertical" className="h-4" />
                    <Button variant="ghost" size="sm" className="h-6 px-2">B</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 italic">I</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 underline">U</Button>
                  </div>
                  <div 
                    className="min-h-[100px] p-3 border rounded-lg text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: task.htmlContent || "<ul><li>Communication of the expectations</li><li>Budget estimations</li><li>This phase will be done through a Zoom/Personal Meeting to establish objectives and needs.</li></ul>" 
                    }}
                  />
                </div>
              </TabsContent>

              {/* Tab: Información */}
              <TabsContent value="info" className="flex-1 overflow-auto p-4 space-y-6">
                {/* Payment Schedule */}
                <div className="space-y-3">
                  <h4 className="font-medium">Pagos programados</h4>
                  {paymentSchedules.length > 0 ? (
                    <div className="space-y-2">
                      {paymentSchedules.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{payment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{payment.amount.toLocaleString()}€</p>
                            <Badge variant={payment.isPaid ? "success" : "secondary"}>
                              {payment.isPaid ? "Pagado" : "Pendiente"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <p>Primer Pago: 23/12/2025 - 12.000€</p>
                      <p>Segundo Pago 20%: 12/08/2026 - 2.000€</p>
                      <Button variant="link" className="p-0 h-auto text-sm">Add Payment</Button>
                    </div>
                  )}
                </div>

                {/* Calendar */}
                <div className="space-y-3">
                  <h4 className="font-medium">Calendario</h4>
                  <div className="border rounded-lg p-4">
                    {/* Simplified calendar placeholder */}
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].map((day) => (
                        <div key={day} className="text-muted-foreground py-1">{day}</div>
                      ))}
                      {Array.from({ length: 35 }, (_, i) => (
                        <div 
                          key={i} 
                          className={`py-1 rounded ${i === 15 ? "bg-primary text-primary-foreground" : ""}`}
                        >
                          {((i % 31) + 1)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Attachments Tabs */}
                <Tabs defaultValue="archivos" className="space-y-3">
                  <TabsList>
                    <TabsTrigger value="archivos">Archivos</TabsTrigger>
                    <TabsTrigger value="documentos">Documentos</TabsTrigger>
                    <TabsTrigger value="enlaces">Enlaces</TabsTrigger>
                  </TabsList>
                  <TabsContent value="archivos" className="grid grid-cols-3 gap-2">
                    {attachments.images.length > 0 ? (
                      attachments.images.map((img) => (
                        <div key={img.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <img src={img.thumbnail || img.url} alt={img.name} className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-sm text-muted-foreground text-center py-8">
                        No hay archivos adjuntos
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="documentos" className="space-y-2">
                    {attachments.documents.length > 0 ? (
                      attachments.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{doc.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No hay documentos adjuntos
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="enlaces" className="space-y-2">
                    {attachments.links.length > 0 ? (
                      attachments.links.map((link) => (
                        <a key={link.id} href={link.url} className="flex items-center gap-2 p-2 border rounded hover:bg-muted">
                          <Link2 className="h-4 w-4" />
                          <span className="text-sm">{link.name}</span>
                        </a>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No hay enlaces adjuntos
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Tab: Orden del día */}
              <TabsContent value="schedule" className="flex-1 overflow-auto p-4 space-y-4">
                <h4 className="font-medium">Cronograma del día</h4>
                {scheduleItems.length > 0 ? (
                  <div className="space-y-3">
                    {scheduleItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium">{item.title}</h5>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            <p>{new Date(item.date).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">
                              {item.startTime}{item.endTime && ` - ${item.endTime}`}
                            </p>
                          </div>
                        </div>
                        <Button variant="link" className="p-0 h-auto text-sm">Más detalles</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Demo schedule items */}
                    {[
                      { title: "Montaje", date: "23/12/2025", time: "09:00am", desc: "Lorem ipsum dolor sit amet..." },
                      { title: "Cóctel", date: "23/12/2025", time: "11:00am" },
                      { title: "Cena", date: "23/12/2025", time: "12:30pm" },
                      { title: "Barra Libre", date: "23/12/2025", time: "16:00pm" },
                    ].map((item, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium">{item.title}</h5>
                            {item.desc && <p className="text-sm text-muted-foreground line-clamp-2">{item.desc}</p>}
                            <Button variant="link" className="p-0 h-auto text-sm">Más detalles</Button>
                          </div>
                          <div className="text-right text-sm">
                            <p>{item.date}</p>
                            <p className="text-muted-foreground">{item.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">Add Order</Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Side - Chat */}
          <div className="w-[320px] flex flex-col bg-muted/30">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.senderImage || undefined} />
                          <AvatarFallback>
                            {message.senderName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{message.senderName || "Usuario"}</span>
                            {message.isPrivate && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Privado
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            {message.type === "file" && message.attachments?.[0] ? (
                              <div className="flex items-center gap-2 p-2 bg-background rounded border">
                                <FileText className="h-4 w-4" />
                                <span>{message.attachments[0].name}</span>
                                <Button variant="link" size="sm" className="ml-auto">Descargarlo</Button>
                              </div>
                            ) : (
                              <p>{message.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Demo messages
                  <>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8 bg-orange-500">
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Admin</span>
                            <span className="text-xs text-muted-foreground">Nov 7</span>
                          </div>
                          <p className="text-sm">Un nuevo documento ha sido añadido</p>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border">
                            <FileText className="h-4 w-4" />
                            <Button variant="link" size="sm" className="ml-auto">Descargarlo</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8 bg-orange-500">
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Admin</span>
                            <Badge variant="outline" className="text-xs text-yellow-600">
                              Comentario privado
                            </Badge>
                            <span className="text-xs text-muted-foreground">Nov 7</span>
                          </div>
                          <p className="text-sm">Recordar que esta pendiente el pago recordatorio</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t bg-background">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Añade un comentario"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => onAddAttachment?.("file")}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="private" 
                    checked={isPrivate}
                    onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                  />
                  <label htmlFor="private" className="text-sm text-muted-foreground">
                    Comentario Privado
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
