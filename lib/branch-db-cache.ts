import { PrismaClient } from "@/generated/branch";

const branchClients = new Map<string, PrismaClient>();

export function getBranchClient(
  branchSlug: string,
  databaseUrl: string,
) {
  const existing = branchClients.get(branchSlug);

  if (existing) {
    return existing;
  }

  const client = new PrismaClient({
    datasourceUrl: databaseUrl,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  branchClients.set(branchSlug, client);

  return client;
}