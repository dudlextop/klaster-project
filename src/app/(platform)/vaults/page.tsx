import { redirect } from "next/navigation";
import { getCanonicalPublicVaultHref } from "@/server/vaults/public";

export default async function VaultsIndexPage() {
  redirect(await getCanonicalPublicVaultHref());
}
