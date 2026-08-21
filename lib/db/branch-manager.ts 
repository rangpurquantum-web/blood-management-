import { PrismaClient } from "@/generated/branch";

const branchClients = new Map<string, PrismaClient>();

export function getBranchPrismaClient(databaseUrl: string): PrismaClient {
  if (branchClients.has(databaseUrl)) {
    return branchClients.get(databaseUrl)!;
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  branchClients.set(databaseUrl, client);
  return client;
}