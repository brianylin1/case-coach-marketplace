"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ChipSelect } from "./ChipSelect";
import { FIRMS, FOCUS_AREAS } from "@/lib/constants";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

export function CoachSignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState<string>("");
  const [title, setTitle] = useState("");
  const [yearsAtFirm, setYearsAtFirm] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleFocus(key: string) {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          firm,
          title,
          yearsAtFirm: Number(yearsAtFirm) || 0,
          headline,
          bio,
          focusAreas,
          hourlyRate: Number(hourlyRate) || 0,
          availability,
          linkedinUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className={`${inputClass} mt-1.5`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maya Chen"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`${inputClass} mt-1.5`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="firm">
            Firm
          </label>
          <select
            id="firm"
            className={`${inputClass} mt-1.5`}
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            required
          >
            <option value="" disabled>
              Select…
            </option>
            {FIRMS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className={`${inputClass} mt-1.5`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Engagement Manager"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="years">
            Years at firm
          </label>
          <input
            id="years"
            type="number"
            min={0}
            max={60}
            className={`${inputClass} mt-1.5`}
            value={yearsAtFirm}
            onChange={(e) => setYearsAtFirm(e.target.value)}
            placeholder="4"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="headline">
          Headline <span className="font-normal text-slate-400">(one line students see first)</span>
        </label>
        <input
          id="headline"
          maxLength={160}
          className={`${inputClass} mt-1.5`}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="I'll teach you the structuring instinct interviewers look for."
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          className={`${inputClass} mt-1.5`}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell students about your background, coaching style, and who you're a great fit for."
          required
        />
      </div>

      <div>
        <label className={labelClass}>What do you coach?</label>
        <p className="mb-2 mt-1 text-sm text-slate-500">Pick at least one.</p>
        <ChipSelect options={FOCUS_AREAS} selected={focusAreas} onToggle={toggleFocus} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="rate">
            Hourly rate (USD)
          </label>
          <input
            id="rate"
            type="number"
            min={0}
            className={`${inputClass} mt-1.5`}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="0 = pro bono"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="availability">
            Availability <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="availability"
            className={`${inputClass} mt-1.5`}
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Weeknights & weekends (ET)"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="linkedin">
          LinkedIn URL <span className="font-normal text-slate-400">(optional, builds trust)</span>
        </label>
        <input
          id="linkedin"
          className={`${inputClass} mt-1.5`}
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/…"
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        {loading ? "Creating your profile…" : "Start coaching"}
      </button>
      <p className="text-center text-xs text-slate-400">
        No password needed — we&apos;ll recognize you by email next time.
      </p>
    </form>
  );
}
