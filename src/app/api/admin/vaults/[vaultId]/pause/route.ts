import { type NextRequest, NextResponse } from "next/server";
import { requireMvpAccessSession } from "@/server/auth/guards";
import { handleRouteError } from "@/server/http/errors";
import { pauseVaultSchema, setVaultPauseState } from "@/server/vaults/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    vaultId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireMvpAccessSession();
    const body = pauseVaultSchema.parse(await request.json());
    const { vaultId } = await context.params;
    const result = await setVaultPauseState(vaultId, body, session);

    return NextResponse.json({
      vault: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
