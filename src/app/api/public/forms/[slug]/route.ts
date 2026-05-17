import { NextRequest } from "next/server";
import { getFormInstanceBySlug } from "@/lib/form-instances";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return apiHandler(async () => {
    const { slug } = await params;

    if (!slug) {
      return badRequest("Slug requerido");
    }

    const instance = await getFormInstanceBySlug(slug);
    if (!instance || !instance.form) {
      return notFound("Formulario no encontrado");
    }

    if (instance.form.status !== "active") {
      return notFound("Formulario no disponible");
    }

    return ok({
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
    });
  }, "GET /api/public/forms/[slug]");
}
