import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiFeedback } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messageId, rating, comment } = await req.json();

    if (!messageId || !rating) {
      return new Response(JSON.stringify({ error: "messageId y rating son requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await db.insert(aiFeedback).values({
      messageId,
      userId: session.user.id,
      rating,
      comment,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error guardando feedback:", error);
    return new Response(
      JSON.stringify({ error: "Error al guardar feedback" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
