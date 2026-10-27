import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const demoEmail = "demo@expense.id";
  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        name: "Pengguna Demo",
        email: demoEmail,
        passwordHash: hashPassword("demo12345"),
      },
    });
  }

  const count = await prisma.expense.count({
    where: { userId: demoUser.id },
  });

  if (count > 0) {
    console.log(`Database already has ${count} expense records for demo user.`);
    return;
  }

  const now = new Date();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.max(1, now.getDate() - 1),
    12,
    0,
    0
  );
  const twoDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.max(1, now.getDate() - 2),
    12,
    0,
    0
  );

  await prisma.expense.createMany({
    data: [
      {
        amount: 28000,
        category: "Makanan",
        note: "Makan siang nasi padang & es teh",
        date: now,
        userId: demoUser.id,
      },
      {
        amount: 15000,
        category: "Transportasi",
        note: "Ojek online ke kampus",
        date: now,
        userId: demoUser.id,
      },
      {
        amount: 45000,
        category: "Kuliah/Belajar",
        note: "Cetak modul praktikum & jilid",
        date: yesterday,
        userId: demoUser.id,
      },
      {
        amount: 85000,
        category: "Kebutuhan Kost",
        note: "Token listrik & sabun cuci",
        date: twoDaysAgo,
        userId: demoUser.id,
      },
    ],
  });

  console.log("Seeded initial demo user and expense records.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
