"use server";

import { requireMvpAccessSession } from "@/server/auth/guards";
import {
  createPrivateDocumentUpload,
  privateUploadRequestSchema,
} from "@/server/storage/private-documents";
import {
  operatorVaultDraftSchema,
  saveOperatorVaultDraft,
} from "@/server/vaults/operator";

export async function saveOperatorVaultDraftAction(input: unknown) {
  const session = await requireMvpAccessSession();

  return saveOperatorVaultDraft(operatorVaultDraftSchema.parse(input), session);
}

export async function createPrivateDocumentUploadAction(
  vaultId: string,
  input: unknown,
) {
  const session = await requireMvpAccessSession();

  return createPrivateDocumentUpload({
    ...privateUploadRequestSchema.parse(input),
    session,
    vaultId,
  });
}
