"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ChipSelect } from "./ChipSelect";
import { FIRMS, FOCUS_AREAS, MEETING_PLATFORMS } from "@/lib/constants";
import { COMMON_TIMEZONES } from "@/lib/timezone";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

export function CoachSignupForm({ defaultTimezone }: { defaultTimezone: string }) {
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
  const [meetingPlatform, setMeetingPlatform] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [meetingPasscode, setMeetingPasscode] = useState("");
  const [meetingInstructions, setMeetingInstructions] = useState("");
  const [timezone, setTimezone] = useState(defaultTimezone);
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
    if (!meetingPlatform || !/^https?:\/\/\S+/i.test(meetingUrl.trim())) {
      setError("Add your meeting platform and a valid meeting URL — students need it to join your sessions.");
      return;
    }
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
          meetingPlatform,
          meetingUrl,
          meetingId,
          meetingPasscode,
          meetingInstructions,
          timezone,
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

  // Ensure the detected zone is selectable even if it's not in the curated list.
  const tzOptions = COMMON_TIMEZONES.some((t) => t.value === timezone)
    ? COMMON_TIMEZONES
    : [{ value: timezone, label: timezone }, ...COMMON_TIMEZONES];

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
        <label className={labelClass} htmlFor="timezone">
          Your timezone
        </label>
        <select
          id="timezone"
          className={`${inputClass} mt-1.5`}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {tzOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          You&apos;ll paint your weekly availability in this timezone. Students
          see each time converted to their own.
        </p>
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

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Default coaching room</h2>
        <p className="mt-1 text-xs text-slate-500">
          Students will receive this room in every calendar invite after they
          book you. Use a reusable Teams, Zoom, or Google Meet link. Keep this
          room active and accurate.
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="meetingPlatform">
                Meeting platform <span className="text-red-500">*</span>
              </label>
              <select
                id="meetingPlatform"
                className={`${inputClass} mt-1.5`}
                value={meetingPlatform}
                onChange={(e) => setMeetingPlatform(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select…
                </option>
                {MEETING_PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="meetingId">
                Meeting ID <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="meetingId"
                className={`${inputClass} mt-1.5`}
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="123 456 789"
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="meetingUrl">
              Meeting URL <span className="text-red-500">*</span>
            </label>
            <input
              id="meetingUrl"
              className={`${inputClass} mt-1.5`}
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://teams.microsoft.com/l/meetup-join/…"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="meetingPasscode">
              Passcode / password{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="meetingPasscode"
              className={`${inputClass} mt-1.5`}
              value={meetingPasscode}
              onChange={(e) => setMeetingPasscode(e.target.value)}
              placeholder="ABC123"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="meetingInstructions">
              Additional joining instructions{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="meetingInstructions"
              rows={2}
              className={`${inputClass} mt-1.5`}
              value={meetingInstructions}
              onChange={(e) => setMeetingInstructions(e.target.value)}
              placeholder="e.g. I'll admit you from the lobby at the start time."
            />
          </div>
        </div>
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
