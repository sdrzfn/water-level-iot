import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv';

dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(
    {
      log: ['query', 'error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }
  );

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma