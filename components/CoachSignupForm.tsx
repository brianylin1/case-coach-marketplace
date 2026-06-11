"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ChipSelect } from "./ChipSelect";
import {
  BEST_FOR,
  FIRMS,
  FIRM_STATUSES,
  FOCUS_AREAS,
  MEETING_PLATFORMS,
  SESSION_STYLES,
} from "@/lib/constants";
import { COMMON_TIMEZONES } from "@/lib/timezone";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

export type CoachFormValues = {
  name: string;
  email: string;
  firm: string;
  title: string;
  yearsAtFirm: string;
  headline: string;
  bio: string;
  focusAreas: string[];
  hourlyRate: string;
  availability: string;
  linkedinUrl: string;
  bestFor: string;
  sessionStyles: string[];
  firmStatus: string;
  meetingPlatform: string;
  meetingUrl: string;
  meetingId: string;
  meetingPasscode: string;
  meetingInstructions: string;
  timezone: string;
};

export function CoachSignupForm({
  defaultTimezone,
  initialValues,
  editing = false,
  focusSection,
}: {
  defaultTimezone: string;
  initialValues?: Partial<CoachFormValues>;
  editing?: boolean;
  focusSection?: string;
}) {
  const router = useRouter();
  const iv = initialValues ?? {};
  const [name, setName] = useState(iv.name ?? "");
  const [email, setEmail] = useState(iv.email ?? "");
  const [firm, setFirm] = useState<string>(iv.firm ?? "");
  const [title, setTitle] = useState(iv.title ?? "");
  const [yearsAtFirm, setYearsAtFirm] = useState(iv.yearsAtFirm ?? "");
  const [headline, setHeadline] = useState(iv.headline ?? "");
  const [bio, setBio] = useState(iv.bio ?? "");
  const [focusAreas, setFocusAreas] = useState<string[]>(iv.focusAreas ?? []);
  const [hourlyRate, setHourlyRate] = useState(iv.hourlyRate ?? "");
  const [availability, setAvailability] = useState(iv.availability ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(iv.linkedinUrl ?? "");
  const [bestFor, setBestFor] = useState(iv.bestFor ?? "");
  const [sessionStyles, setSessionStyles] = useState<string[]>(iv.sessionStyles ?? []);
  const [firmStatus, setFirmStatus] = useState(iv.firmStatus ?? "");
  const [meetingPlatform, setMeetingPlatform] = useState(iv.meetingPlatform ?? "");
  const [meetingUrl, setMeetingUrl] = useState(iv.meetingUrl ?? "");
  const [meetingId, setMeetingId] = useState(iv.meetingId ?? "");
  const [meetingPasscode, setMeetingPasscode] = useState(iv.meetingPasscode ?? "");
  const [meetingInstructions, setMeetingInstructions] = useState(iv.meetingInstructions ?? "");
  const [timezone, setTimezone] = useState(iv.timezone ?? defaultTimezone);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Scroll straight to the meeting section when arrived at via Configure Meeting Room.
  const meetingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusSection === "meeting") {
      meetingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusSection]);

  function toggleFocus(key: string) {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleSessionStyle(key: string) {
    setSessionStyles((prev) =>
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
          bestFor,
          sessionStyles,
          firmStatus,
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
            className={`${inputClass} mt-1.5 ${editing ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            readOnly={editing}
          />
          {editing && (
            <p className="mt-1 text-xs text-slate-400">Email can&apos;t be changed.</p>
          )}
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

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h2 className="text-sm font-semibold text-slate-900">How you coach</h2>
        <p className="mt-1 text-sm text-slate-500">
          Optional, but it helps students pick you — all clicks, no writing.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass} htmlFor="bestFor">
              What are you best for?
            </label>
            <select
              id="bestFor"
              className={`${inputClass} mt-1.5`}
              value={bestFor}
              onChange={(e) => setBestFor(e.target.value)}
            >
              <option value="">Auto — use my top focus area</option>
              {BEST_FOR.map((b) => (
                <option key={b.key} value={b.key}>
                  Best for {b.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              The one thing you most want to be booked for — students see it as
              “Best for …” on your card.
            </p>
          </div>
          <div>
            <label className={labelClass}>How do you run sessions?</label>
            <p className="mb-2 mt-1 text-sm text-slate-500">Pick any that apply.</p>
            <ChipSelect
              options={SESSION_STYLES.map((s) => ({ key: s.key, label: s.label }))}
              selected={sessionStyles}
              onToggle={toggleSessionStyle}
            />
          </div>
          <div>
            <span className={labelClass}>
              Are you currently at {firm || "your firm"}?
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {FIRM_STATUSES.map((s) => {
                const active = firmStatus === s.key;
                return (
                  <button
                    type="button"
                    key={s.key}
                    aria-pressed={active}
                    onClick={() => setFirmStatus(active ? "" : s.key)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Lets your profile say “Current …” or “Former …” before your firm
              and title. Tap again to clear.
            </p>
          </div>
        </div>
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

      <div
        ref={meetingRef}
        id="meeting-room"
        className={`scroll-mt-6 rounded-xl border bg-slate-50/60 p-4 ${
          focusSection === "meeting"
            ? "border-indigo-400 ring-2 ring-indigo-200"
            : "border-slate-200"
        }`}
      >
        <h2 className="text-sm font-semibold text-slate-900">Your reusable coaching room</h2>
        <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm font-semibold text-indigo-900">Do this once</p>
          <p className="mt-1 text-sm text-indigo-900/80">
            Create one reusable Teams, Zoom, or Google Meet room and paste the
            join link here. CaseCoach will use this same room in every student
            calendar invite. You do not need to create a new meeting or invite for
            each booking.
          </p>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Example workflow</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>
              In Teams, Zoom, or Google Meet, create a reusable meeting room or
              recurring meeting.
            </li>
            <li>Copy the join link.</li>
            <li>Paste it below.</li>
            <li>
              When a student books, CaseCoach sends both of you a calendar invite
              using this same link.
            </li>
          </ol>
        </div>
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
              <p className="mt-1 text-xs text-slate-400">
                If your meeting has an ID or passcode, add it here so students can
                join without back-and-forth.
              </p>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="meetingUrl">
              Reusable join link <span className="text-red-500">*</span>
            </label>
            <input
              id="meetingUrl"
              className={`${inputClass} mt-1.5`}
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://teams.microsoft.com/l/meetup-join/…"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              Paste the permanent Teams, Zoom, or Google Meet link students should
              use for every session with you.
            </p>
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
            <p className="mt-1 text-xs text-slate-400">
              Example: “I’ll admit you from the lobby at the start time” or “Use
              the passcode above if prompted.”
            </p>
          </div>
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            CaseCoach creates the calendar invite. You only provide the room where
            the session happens.
          </p>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        {loading
          ? editing
            ? "Saving…"
            : "Creating your profile…"
          : editing
            ? "Save changes"
            : "Start coaching"}
      </button>
      {!editing && (
        <p className="text-center text-xs text-slate-400">
          No password needed — we&apos;ll recognize you by email next time.
        </p>
      )}
    </form>
  );
}
