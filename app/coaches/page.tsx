import { Frown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { CoachCard } from "@/components/CoachCard";
import { CoachFilters } from "@/components/CoachFilters";
import { isFirm, isFocusKey } from "@/lib/constants";

type SearchParams = Promise<{
  firm?: string;
  focus?: string;
  sort?: string;
  q?: string;
}>;

const ORDER_BY: Record<string, Prisma.CoachOrderByWithRelationInput[]> = {
  "rate-asc": [{ hourlyRate: "asc" }, { id: "asc" }],
  "rate-desc": [{ hourlyRate: "desc" }, { id: "asc" }],
  experience: [{ yearsAtFirm: "desc" }, { id: "asc" }],
  recommended: [{ yearsAtFirm: "desc" }, { id: "asc" }],
};

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { firm, focus, sort, q } = await searchParams;

  const where: Prisma.CoachWhereInput = { isActive: true };
  if (firm && isFirm(firm)) where.firm = firm;
  if (focus && isFocusKey(focus)) {
    // focusAreas is a JSON-array string, so match the quoted key.
    where.focusAreas = { contains: `"${focus}"` };
  }
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term } },
      { firm: { contains: term } },
      { title: { contains: term } },
      { headline: { contains: term } },
      { bio: { contains: term } },
    ];
  }

  const coaches = await prisma.coach.findMany({
    where,
    orderBy: ORDER_BY[sort ?? "recommended"] ?? ORDER_BY.recommended,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Find your coach
        </h1>
        <p className="mt-1 text-slate-600">
          Browse current and former MBB consultants. Filter by firm, focus area,
          and rate to find your fit.
        </p>
      </header>

      <CoachFilters />

      <p className="mt-6 text-sm text-slate-500">
        {coaches.length} {coaches.length === 1 ? "coach" : "coaches"}
      </p>

      {coaches.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Frown className="size-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">No coaches match</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Try clearing a filter or broadening your search.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>
      )}
    </div>
  );
}
