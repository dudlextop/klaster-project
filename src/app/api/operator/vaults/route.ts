import { type NextRequest, NextResponse } from "next/server";
import { requireMvpAccessSession } from "@/server/auth/guards";
import { handleRouteError } from "@/server/http/errors";
import {
  operatorVaultDraftSchema,
  saveOperatorVaultDraft,
} from "@/server/vaults/operator";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await requireMvpAccessSession();
    const body = operatorVaultDraftSchema.parse(await request.json());
    const vault = await saveOperatorVaultDraft(body, session);

    return NextResponse.json(
      {
        vault,
      },
      {
        status: body.vaultId ? 200 : 201,
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
