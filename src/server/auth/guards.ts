import { cookies } from "next/headers";
import { hasWalletSessionRuntime } from "@/server/auth/runtime";
import { type AppRole, readSessionToken } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";

function getDemoSession(role: AppRole) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (hasWalletSessionRuntime()) {
    return null;
  }

  return {
    profileId: `demo-${role}-profile`,
    regionCode: "KZ",
    role,
    walletAddress: `demo-${role}-wallet`,
  } as const;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();

  return readSessionToken(cookieStore.get("klasterai_session")?.value);
}

export function getDemoSessionForRole(role: AppRole) {
  return getDemoSession(role);
}

export async function requireCurrentSession(allowedRoles?: readonly AppRole[]) {
  const session = await getCurrentSession();

  if (!session) {
    throw new AppError(401, "Authentication is required.");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new AppError(
      403,
      "You do not have permission to access this resource.",
    );
  }

  return session;
}

export async function requireMvpAccessSession() {
  const session = await getCurrentSession();

  if (!session) {
    throw new AppError(401, "Authentication is required.");
  }

  return session;
}
