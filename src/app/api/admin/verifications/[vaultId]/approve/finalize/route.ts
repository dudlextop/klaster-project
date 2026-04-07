import { type NextRequest, NextResponse } from "next/server";
import { requireMvpAccessSession } from "@/server/auth/guards";
import { handleRouteError } from "@/server/http/errors";
import {
  finalizeVaultApproval,
  finalizeVaultApprovalSchema,
} from "@/server/vaults/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    vaultId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireMvpAccessSession();
    const body = finalizeVaultApprovalSchema.parse(await request.json());
    const { vaultId } = await context.params;
    const result = await finalizeVaultApproval(vaultId, body, session);

    return NextResponse.json({
      review: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
