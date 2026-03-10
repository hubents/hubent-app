import { NextResponse } from "next/server";
import { getFormInstanceBySlug } from "@/lib/form-instances";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug requerido" }, { status: 400 });
    }

    const instance = await getFormInstanceBySlug(slug);
    if (!instance || !instance.form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    if (instance.form.status !== "active") {
      return NextResponse.json({ success: false, error: "Formulario no disponible" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceId: instance.id,
        form: {
          id: instance.form.id,
          name: instance.form.name,
          description: instance.form.description,
          logoUrl: instance.form.logoUrl,
          coverImage: instance.form.coverImage,
          primaryColor: instance.form.primaryColor,
          submitButtonText: instance.form.submitButtonText,
          thankYouTitle: instance.form.thankYouTitle,
          thankYouMessage: instance.form.thankYouMessage,
          redirectUrl: instance.form.redirectUrl,
          gdprEnabled: instance.form.gdprEnabled,
          gdprText: instance.form.gdprText,
          gdprLink: instance.form.gdprLink,
          fields: instance.form.fields,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
