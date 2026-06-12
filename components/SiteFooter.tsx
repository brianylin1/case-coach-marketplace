import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold text-slate-900">Down to Case</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <Link href="/sessions" className="hover:text-slate-900">
              Find a session
            </Link>
            <Link href="/signup/student" className="hover:text-slate-900">
              For students
            </Link>
            <Link href="/signup/coach" className="hover:text-slate-900">
              For coaches
            </Link>
            <Link href="/login" className="hover:text-slate-900">
              Sign in
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Down to Case. An independent
          marketplace, not affiliated with or endorsed by any of the firms
          named on this site.
        </p>
      </div>
    </footer>
  );
}
