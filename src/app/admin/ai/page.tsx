import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Zap,
  FileText,
  Settings,
  TrendingUp,
  Clock
} from "lucide-react";
import { db } from "@/db";
import { aiConversations, aiMessages, aiFeedback, aiDocuments } from "@/db/schema";
import { count, sum, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getAIStats() {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  const [totalConversations] = await db.select({ count: count() }).from(aiConversations);
  const [totalMessages] = await db.select({ count: count() }).from(aiMessages);
  const [totalDocs] = await db.select({ count: count() }).from(aiDocuments);
  
  const [positiveFeedback] = await db
    .select({ count: count() })
    .from(aiFeedback)
    .where(eq(aiFeedback.rating, 5));
  
  const [negativeFeedback] = await db
    .select({ count: count() })
    .from(aiFeedback)
    .where(eq(aiFeedback.rating, 1));

  const [weeklyConversations] = await db
    .select({ count: count() })
    .from(aiConversations)
    .where(gte(aiConversations.createdAt, lastWeek));

  const totalFeedback = (positiveFeedback?.count || 0) + (negativeFeedback?.count || 0);
  const satisfactionRate = totalFeedback > 0 
    ? Math.round(((positiveFeedback?.count || 0) / totalFeedback) * 100) 
    : 0;

  return {
    totalConversations: totalConversations?.count || 0,
    totalMessages: totalMessages?.count || 0,
    totalDocs: totalDocs?.count || 0,
    positiveFeedback: positiveFeedback?.count || 0,
    negativeFeedback: negativeFeedback?.count || 0,
    weeklyConversations: weeklyConversations?.count || 0,
    satisfactionRate,
  };
}

async function getRecentConversations() {
  return await db
    .select({
      id: aiConversations.id,
      title: aiConversations.title,
      messageCount: aiConversations.messageCount,
      createdAt: aiConversations.createdAt,
    })
    .from(aiConversations)
    .orderBy(sql`${aiConversations.createdAt} DESC`)
    .limit(5);
}

export default async function AdminAIPage() {
  const stats = await getAIStats();
  const recentConversations = await getRecentConversations();

  const statCards = [
    {
      title: "Conversaciones",
      value: stats.totalConversations,
      subtitle: `${stats.weeklyConversations} esta semana`,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Mensajes Totales",
      value: stats.totalMessages,
      subtitle: "Todos los tiempos",
      icon: Zap,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Satisfacción",
      value: `${stats.satisfactionRate}%`,
      subtitle: `${stats.positiveFeedback} 👍 / ${stats.negativeFeedback} 👎`,
      icon: ThumbsUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Documentos",
      value: stats.totalDocs,
      subtitle: "Base de conocimiento",
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Asistente IA - HubIA</h1>
            <p className="text-muted-foreground">
              Gestiona y entrena el asistente inteligente {/* HIDDEN TEMPORARILY: • Powered by NapsixAI */}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Activo
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/ai/documents">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Gestionar Documentación</p>
                  <p className="text-xs text-muted-foreground">
                    Agregar FAQs, tutoriales y contenido de ayuda
                  </p>
                </div>
              </Button>
            </Link>
            
            <Link href="/admin/ai/prompts">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Zap className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Editar Prompts</p>
                  <p className="text-xs text-muted-foreground">
                    Personalizar comportamiento y respuestas
                  </p>
                </div>
              </Button>
            </Link>
            
            <Link href="/admin/ai/settings">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="p-2 rounded-lg bg-slate-500/10">
                  <Settings className="w-5 h-5 text-slate-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Configuración</p>
                  <p className="text-xs text-muted-foreground">
                    Modelo, temperatura, límites de uso
                  </p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Conversaciones Recientes</CardTitle>
            <Link href="/admin/ai/analytics">
              <Button variant="ghost" size="sm">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay conversaciones aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <MessageSquare className="w-4 h-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {conv.title || "Sin título"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {conv.createdAt ? new Date(conv.createdAt).toLocaleDateString("es-ES") : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{conv.messageCount} msgs</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Info */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20">
                <TrendingUp className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="font-medium">Modelo Activo</p>
                <p className="text-sm text-muted-foreground">
                  Google Gemini 2.0 Flash • Optimizado para velocidad y precisión
                </p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
              gemini-2.0-flash
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
