import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getContactPhotos, addContactPhoto, deleteContactPhoto } from "@/lib/contacts";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/photos - List contact photos
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("viewer");
    const { id } = await params;

    const photos = await getContactPhotos(parseInt(id, 10));

    return NextResponse.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    console.error("GET /api/contacts/[id]/photos error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch photos";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/contacts/[id]/photos - Add photo to contact
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const body = await request.json();

    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "URL is required" } },
        { status: 400 }
      );
    }

    const photo = await addContactPhoto(parseInt(id, 10), {
      url,
      thumbnail: body.thumbnail,
      caption: body.caption,
      sortOrder: body.sortOrder,
      uploadedBy: session.user.userId,
    });

    return NextResponse.json({
      success: true,
      data: photo,
    });
  } catch (error) {
    console.error("POST /api/contacts/[id]/photos error:", error);
    const message = error instanceof Error ? error.message : "Failed to add photo";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/contacts/[id]/photos - Delete photo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("planner");
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Photo ID is required" } },
        { status: 400 }
      );
    }

    await deleteContactPhoto(parseInt(photoId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Photo deleted" },
    });
  } catch (error) {
    console.error("DELETE /api/contacts/[id]/photos error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete photo";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
