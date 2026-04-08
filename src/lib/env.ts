import { DEFAULT_SETTLEMENT_MINT } from "@/lib/solana/settlement";

const SOLANA_CLUSTERS = ["localnet", "devnet", "mainnet-beta"] as const;

export type SolanaCluster = (typeof SOLANA_CLUSTERS)[number];

export type PublicRuntimeEnv = {
  appUrl: string;
  heliusRpcUrl: string;
  programId: string;
  solanaCluster: SolanaCluster;
  supabaseAnonKey: string;
  supabaseUrl: string;
};

export type ServerRuntimeEnv = {
  appRegionBlocklist: string;
  heliusApiKey: string;
  heliusWebhookSecret: string;
  pinataJwt: string;
  resendApiKey: string;
  settlementMintAddress: string;
  sessionSecret: string;
  solanaAdminMultisig: string;
  supabasePrivateBucket: string;
  supabaseServiceRoleKey: string;
  telegramBotToken: string;
};

function parseSolanaCluster(value: string | undefined): SolanaCluster {
  if (value && SOLANA_CLUSTERS.includes(value as SolanaCluster)) {
    return value as SolanaCluster;
  }

  return "devnet";
}

function readString(value: string | undefined, fallback = "") {
  return value?.trim() ?? fallback;
}

export function getPublicEnv(): PublicRuntimeEnv {
  return {
    appUrl: readString(
      process.env.NEXT_PUBLIC_APP_URL,
      "http://127.0.0.1:3000",
    ),
    heliusRpcUrl: readString(process.env.NEXT_PUBLIC_HELIUS_RPC_URL),
    programId: readString(
      process.env.NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT ??
        process.env.PROGRAM_ID_KLASTER_VAULT,
    ),
    solanaCluster: parseSolanaCluster(process.env.NEXT_PUBLIC_SOLANA_CLUSTER),
    supabaseAnonKey: readString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseUrl: readString(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
}

export function getServerEnv(): ServerRuntimeEnv {
  return {
    appRegionBlocklist: readString(process.env.APP_REGION_BLOCKLIST, "US"),
    heliusApiKey: readString(process.env.HELIUS_API_KEY),
    heliusWebhookSecret: readString(process.env.HELIUS_WEBHOOK_SECRET),
    pinataJwt: readString(process.env.PINATA_JWT),
    resendApiKey: readString(process.env.RESEND_API_KEY),
    settlementMintAddress: DEFAULT_SETTLEMENT_MINT,
    sessionSecret: readString(process.env.SESSION_SECRET),
    solanaAdminMultisig: readString(process.env.SOLANA_ADMIN_MULTISIG),
    supabasePrivateBucket: readString(process.env.SUPABASE_PRIVATE_BUCKET),
    supabaseServiceRoleKey: readString(process.env.SUPABASE_SERVICE_ROLE_KEY),
    telegramBotToken: readString(process.env.TELEGRAM_BOT_TOKEN),
  };
}
