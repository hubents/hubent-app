import { auth } from "@/lib/auth";
import { db } from "@/db";
import { aiDocuments, platformAdmins } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function isPlatformAdmin(userId: string) {
  const admin = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);
  return admin.length > 0;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isPlatformAdmin(session.user.id))) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const documents = await db
      .select()
      .from(aiDocuments)
      .orderBy(desc(aiDocuments.createdAt));

    return Response.json({ success: true, documents });
  } catch (error) {
    console.error("Error fetching AI documents:", error);
    return Response.json({ error: "Error al obtener documentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isPlatformAdmin(session.user.id))) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, category, tags, priority, type, fileUrl, fileName, fileSize, mimeType, linkUrl } = body;

    if (!title) {
      return Response.json({ error: "Título es requerido" }, { status: 400 });
    }

    const [newDoc] = await db
      .insert(aiDocuments)
      .values({
        title,
        content: content || "",
        category: category || "general",
        tags: tags || [],
        priority: priority || 0,
        type: type || "text",
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        linkUrl,
        createdBy: session.user.id,
      })
      .returning();

    return Response.json({ success: true, document: newDoc });
  } catch (error) {
    console.error("Error creating AI document:", error);
    return Response.json({ error: "Error al crear documento" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isPlatformAdmin(session.user.id))) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, content, category, tags, priority, isActive, type, fileUrl, fileName, fileSize, mimeType, linkUrl } = body;

    if (!id) {
      return Response.json({ error: "ID es requerido" }, { status: 400 });
    }

    const [updated] = await db
      .update(aiDocuments)
      .set({
        title,
        content,
        category,
        tags,
        priority,
        isActive,
        type,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        linkUrl,
        updatedAt: new Date(),
      })
      .where(eq(aiDocuments.id, id))
      .returning();

    return Response.json({ success: true, document: updated });
  } catch (error) {
    console.error("Error updating AI document:", error);
    return Response.json({ error: "Error al actualizar documento" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isPlatformAdmin(session.user.id))) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID es requerido" }, { status: 400 });
    }

    await db.delete(aiDocuments).where(eq(aiDocuments.id, parseInt(id)));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting AI document:", error);
    return Response.json({ error: "Error al eliminar documento" }, { status: 500 });
  }
}
