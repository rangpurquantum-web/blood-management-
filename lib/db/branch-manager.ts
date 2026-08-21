import { PrismaClient } from "@/generated/branch";

// প্রতিটা branch DB URL-এর জন্য client cache করে রাখা হবে,
// যাতে বারবার নতুন connection না বানাতে হয়
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