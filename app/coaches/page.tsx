import { redirect } from "next/navigation";

// The marketplace is now slot-first; the old coach directory lives at /sessions.
export default function CoachesIndexPage() {
  redirect("/sessions");
}
