import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { btnGhost, btnPrimary } from "@/lib/ui";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const name =
    user?.role === "student"
      ? user.student.name
      : user?.role === "coach"
        ? user.coach.name
        : null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            CaseCoach
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/coaches" className={btnGhost}>
            Find a coach
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className={btnGhost}>
                Dashboard
              </Link>
              {name && (
                <span className="hidden px-2 text-sm text-slate-500 md:inline">
                  Hi, {name.split(" ")[0]}
                </span>
              )}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={btnGhost}>
                Sign in
              </Link>
              <Link href="/signup/student" className={btnPrimary}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
