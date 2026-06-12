import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CoachProfilePanel } from "@/components/CoachProfilePanel";
import { BookableSlotList } from "@/components/BookableSlotList";
import { toCoachView, toSessionView } from "@/lib/serialize";
import { bookingWindow, coachSessionStarts } from "@/lib/availability";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { cardClass } from "@/lib/ui";
import type { SlotView } from "@/lib/types";

async function getCoach(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  return prisma.coach.findUnique({ where: { id }, include: { blocks: true } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const coach = await getCoach((await params).id);
  if (!coach) return { title: "Coach not found · Down to Case" };
  return {
    title: `${coach.name}, ${coach.firm} ${coach.title} · Down to Case`,
    description: coach.headline ?? coach.bio.slice(0, 150),
  };
}

export default async function CoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const coach = await getCoach((await params).id);
  if (!coach || !coach.isActive) notFound();

  // Availability is only shown publicly once the coach has set a meeting room.
  const bookable = Boolean(coach.meetingUrl && coach.meetingPlatform);
  const now = new Date();
  const viewerTz = await getViewerTimeZone();
  let slotViews: SlotView[] = [];
  if (bookable) {
    const { lower, upper } = bookingWindow(now, viewerTz);
    const bookings = await prisma.booking.findMany({
      where: { coachId: coach.id, status: "CONFIRMED", startTime: { gte: lower, lt: upper } },
      select: { startTime: true },
    });
    const taken = new Set(bookings.map((b) => new Date(b.startTime).toISOString()));
    slotViews = coachSessionStarts(coach.blocks, lower, upper, coach.timezone)
      .filter((s) => !taken.has(s.toISOString()))
      .slice(0, 24)
      .map((s) => toSessionView(coach, s, viewerTz));
  }

  const user = await getCurrentUser();
  const isStudent = user?.role === "student";
  const coachView = toCoachView(coach);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        All sessions
      </Link>

      <div className={`${cardClass} mt-6 p-6 sm:p-8`}>
        <CoachProfilePanel coach={coachView} />
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Book a session
          </h2>
          <div className="mt-3">
            {bookable ? (
              <BookableSlotList slots={slotViews} isStudent={Boolean(isStudent)} />
            ) : (
              <p className="text-sm text-slate-500">
                This coach isn&apos;t accepting bookings yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
