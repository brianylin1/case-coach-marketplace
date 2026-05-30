import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// A coach accepts or declines a request addressed to them.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "coach") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body.status;
  if (status !== "ACCEPTED" && status !== "DECLINED") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.sessionRequest.findUnique({ where: { id } });
  if (!existing || existing.coachId !== session.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const updated = await prisma.sessionRequest.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
