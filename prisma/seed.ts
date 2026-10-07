import { prisma } from "../src/server/db";
import { boot } from "../src/server/boot";

boot()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Falha no seed.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
