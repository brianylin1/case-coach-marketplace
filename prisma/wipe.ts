import "dotenv/config";
import { prisma } from "@/lib/prisma";

// Destructive: removes ALL accounts and everything attached to them. Used for
// the one-time fresh-start cutover to password auth — after running it, real
// users sign up again and set a password. Booking has no ON DELETE CASCADE to
// Coach/Student, so delete in FK-safe order: bookings → blocks → coaches → students.
//
// Guarded: re-run with CONFIRM_WIPE=1 to actually delete. Prints the target host
// (credentials stripped) so you can confirm you're pointed at the right database.
async function main() {
  const host =
    (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/\?.*$/, "") || "(unknown)";

  if (process.env.CONFIRM_WIPE !== "1") {
    console.error(
      `Refusing to wipe without confirmation.\n` +
        `This DELETES ALL students, coaches, and bookings on:\n  ${host}\n` +
        `Re-run with CONFIRM_WIPE=1 to proceed.`,
    );
    process.exit(1);
  }

  const bookings = await prisma.booking.deleteMany();
  const blocks = await prisma.availabilityBlock.deleteMany();
  const coaches = await prisma.coach.deleteMany();
  const students = await prisma.student.deleteMany();
  console.log(
    `Wiped ${students.count} students, ${coaches.count} coaches, ` +
      `${blocks.count} availability blocks, ${bookings.count} bookings on ${host}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
