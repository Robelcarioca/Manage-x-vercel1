import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient({ log: ["error", "warn"] });

if (!globalForPrisma.__prisma) {
  globalForPrisma.__prisma = prisma;
}

export default prisma;