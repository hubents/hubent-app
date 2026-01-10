import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Clock, ThumbsUp, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { aiConversations, aiMessages, aiFeedback, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

async function getConversations() {
  return await db
    .select({
      id: aiConversations.id,
      sessionId: aiConversations.sessionId,
      title: aiConversations.title,
      messageCount: aiConversations.messageCount,
      userId: aiConversations.userId,
      userName: users.name,
      userEmail: users.email,
      createdAt: aiConversations.createdAt,
    })
    .from(aiConversations)
    .leftJoin(users, eq(users.id, aiConversations.userId))
    .orderBy(desc(aiConversations.createdAt))
    .limit(50);
}

async function getFeedbackStats() {
  const [positive] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiFeedback)
    .where(eq(aiFeedback.rating, 5));
  
  const [negative] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiFeedback)
    .where(eq(aiFeedback.rating, 1));

  return {
    positive: Number(positive?.count || 0),
    negative: Number(negative?.count || 0),
  };
}

export default async function AdminAIAnalyticsPage() {
  const conversations = await getConversations();
  const feedbackStats = await getFeedbackStats();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/ai">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Analytics de IA</h1>
          <p className="text-muted-foreground">
            Historial de conversaciones y métricas de uso
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{conversations.length}</p>
              <p className="text-sm text-muted-foreground">Conversaciones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <ThumbsUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{feedbackStats.positive}</p>
              <p className="text-sm text-muted-foreground">Feedback positivo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <ThumbsDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{feedbackStats.negative}</p>
              <p className="text-sm text-muted-foreground">Feedback negativo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Conversaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay conversaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <MessageSquare className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-md">
                        {conv.title || "Sin título"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{conv.userName || conv.userEmail || "Usuario"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {conv.createdAt 
                            ? new Date(conv.createdAt).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{conv.messageCount || 0} msgs</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
