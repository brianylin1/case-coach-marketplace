import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordError } from "@/lib/password";

// Operator password set/reset. There's no self-serve "forgot password" (that
// would need email-based recovery), so this is how the operator sets a password
// for a real account or resets a forgotten one. Share the value out-of-band.
//
// Usage: EMAIL=a@b.com ROLE=coach PASSWORD=secret123 npm run db:set-password
async function main() {
  const email = (process.env.EMAIL ?? "").trim().toLowerCase();
  const role = process.env.ROLE;
  const password = process.env.PASSWORD ?? "";

  if (!email || (role !== "student" && role !== "coach")) {
    console.error("Usage: EMAIL=a@b.com ROLE=student|coach PASSWORD=… npm run db:set-password");
    process.exit(1);
  }
  const err = passwordError(password);
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  // updateMany so a missing email reports cleanly instead of throwing.
  const result =
    role === "student"
      ? await prisma.student.updateMany({ where: { email }, data: { passwordHash } })
      : await prisma.coach.updateMany({ where: { email }, data: { passwordHash } });

  console.log(
    result.count
      ? `Set password for ${role} ${email}.`
      : `No ${role} found for ${email} — nothing changed.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
