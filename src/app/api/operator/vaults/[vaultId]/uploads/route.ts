import { type NextRequest, NextResponse } from "next/server";
import { requireMvpAccessSession } from "@/server/auth/guards";
import { handleRouteError } from "@/server/http/errors";
import {
  createPrivateDocumentUpload,
  privateUploadRequestSchema,
} from "@/server/storage/private-documents";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    vaultId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireMvpAccessSession();
    const body = privateUploadRequestSchema.parse(await request.json());
    const { vaultId } = await context.params;
    const upload = await createPrivateDocumentUpload({
      ...body,
      session,
      vaultId,
    });

    return NextResponse.json({
      upload,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
