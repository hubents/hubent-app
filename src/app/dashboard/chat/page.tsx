import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  RiSendPlaneLine,
  RiSearchLine,
  RiMoreLine,
  RiAttachmentLine,
  RiEmotionLine,
} from "@remixicon/react";

const conversations = [
  {
    id: "1",
    name: "Equipo Boda García-López",
    lastMessage: "¿Confirmamos el menú para mañana?",
    time: "10:30",
    unread: 3,
    isGroup: true,
  },
  {
    id: "2",
    name: "Carlos López",
    lastMessage: "Ya envié el contrato al fotógrafo",
    time: "09:15",
    unread: 0,
    isGroup: false,
  },
  {
    id: "3",
    name: "Ana Martínez",
    lastMessage: "Perfecto, nos vemos en la reunión",
    time: "Ayer",
    unread: 0,
    isGroup: false,
  },
  {
    id: "4",
    name: "Equipo Boda Martínez-Ruiz",
    lastMessage: "Las invitaciones están listas",
    time: "Ayer",
    unread: 1,
    isGroup: true,
  },
  {
    id: "5",
    name: "Pedro Ruiz",
    lastMessage: "¿Tienes el contacto del DJ?",
    time: "Lun",
    unread: 0,
    isGroup: false,
  },
];

const messages = [
  {
    id: "1",
    sender: "María García",
    content: "Buenos días equipo! ¿Cómo vamos con los preparativos?",
    time: "09:00",
    isMe: false,
  },
  {
    id: "2",
    sender: "Carlos López",
    content: "Todo en orden. El catering confirmó el menú final.",
    time: "09:05",
    isMe: false,
  },
  {
    id: "3",
    sender: "Yo",
    content: "Excelente! ¿Ya tenemos la lista de invitados actualizada?",
    time: "09:10",
    isMe: true,
  },
  {
    id: "4",
    sender: "Ana Martínez",
    content: "Sí, la actualicé ayer. Son 148 confirmados.",
    time: "09:15",
    isMe: false,
  },
  {
    id: "5",
    sender: "María García",
    content: "Perfecto. ¿Confirmamos el menú para mañana?",
    time: "10:30",
    isMe: false,
  },
];

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid h-full gap-4 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Mensajes</CardTitle>
              <Button variant="ghost" size="icon">
                <RiMoreLine className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input placeholder="Buscar conversaciones..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border)]">
              {conversations.map((conv, index) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-[var(--muted)] ${
                    index === 0 ? "bg-[var(--muted)]" : ""
                  }`}
                >
                  <Avatar>
                    <AvatarFallback
                      className={`${
                        conv.isGroup
                          ? "bg-[var(--primary)]"
                          : "bg-[var(--accent)]"
                      } text-white`}
                    >
                      {conv.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conv.name}</p>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {conv.time}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-white">
                      {conv.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {/* Chat Header */}
          <CardHeader className="border-b border-[var(--border)] pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-[var(--primary)] text-white">
                    EB
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">Equipo Boda García-López</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    4 miembros • 2 en línea
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <RiMoreLine className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      message.isMe ? "order-2" : "order-1"
                    }`}
                  >
                    {!message.isMe && (
                      <p className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">
                        {message.sender}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.isMe
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--muted)]"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p
                      className={`mt-1 text-xs text-[var(--muted-foreground)] ${
                        message.isMe ? "text-right" : ""
                      }`}
                    >
                      {message.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          {/* Message Input */}
          <div className="border-t border-[var(--border)] p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <RiAttachmentLine className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Escribe un mensaje..."
                className="flex-1"
              />
              <Button variant="ghost" size="icon">
                <RiEmotionLine className="h-5 w-5" />
              </Button>
              <Button size="icon">
                <RiSendPlaneLine className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
