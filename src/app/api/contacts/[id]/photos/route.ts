import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getContactPhotos, addContactPhoto, deleteContactPhoto } from "@/lib/contacts";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/photos - List contact photos
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    await requirePermission("crm:read");
    const { id } = await params;

    const photos = await getContactPhotos(parseInt(id, 10));

    return ok(photos);
  }, "GET /api/contacts/[id]/photos");
}

// POST /api/contacts/[id]/photos - Add photo to contact
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const body = await request.json();

    const { url } = body;

    if (!url) {
      return badRequest("URL is required");
    }

    const photo = await addContactPhoto(parseInt(id, 10), {
      url,
      thumbnail: body.thumbnail,
      caption: body.caption,
      sortOrder: body.sortOrder,
      uploadedBy: session.user.userId,
    });

    return ok(photo);
  }, "POST /api/contacts/[id]/photos");
}

// DELETE /api/contacts/[id]/photos - Delete photo
export async function DELETE(request: NextRequest, _params: RouteParams) {
  return apiHandler(async () => {
    await requirePermission("crm:manage");
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return badRequest("Photo ID is required");
    }

    await deleteContactPhoto(parseInt(photoId, 10));

    return ok({ message: "Photo deleted" });
  }, "DELETE /api/contacts/[id]/photos");
}
