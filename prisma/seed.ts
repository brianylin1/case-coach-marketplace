import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { serializeList } from "@/lib/format";
import { bookingWindow, coachSessionStarts } from "@/lib/availability";

const coaches = [
  {
    name: "Maya Chen",
    email: "maya.chen@coach.test",
    firm: "McKinsey",
    title: "Engagement Manager",
    yearsAtFirm: 4,
    headline: "I'll teach you the structuring instinct interviewers look for.",
    bio: "Ex-McKinsey EM based in NYC. I've coached 40+ candidates and sat on the other side of the table as an interviewer. My sessions focus on building a repeatable structuring approach so you stop memorizing frameworks and start thinking like a consultant.",
    focusAreas: ["structuring", "profitability", "mock", "behavioral"],
    hourlyRate: 120,
    availability: "Weeknights & Sunday mornings (ET)",
    linkedinUrl: "https://www.linkedin.com/in/example-maya",
    timezone: "America/New_York",
    // [weekday (0=Mon), startHour, endHour] — wall-clock in the coach's timezone.
    blocks: [[0, 18, 21], [2, 18, 21], [6, 9, 12]],
  },
  {
    name: "David Okafor",
    email: "david.okafor@coach.test",
    firm: "Bain",
    title: "Senior Consultant",
    yearsAtFirm: 3,
    headline: "Mental math and crisp synthesis, until they're automatic.",
    bio: "Bain Senior Consultant in London. I'm the coach for you if exhibits and mental math slow you down. We'll drill quant fundamentals and practice top-down communication so your answers land in the first 10 seconds.",
    focusAreas: ["market-sizing", "math", "profitability", "mock"],
    hourlyRate: 90,
    availability: "Weekday mornings (London)",
    linkedinUrl: null,
    timezone: "Europe/London",
    blocks: [[0, 8, 11], [2, 8, 11], [4, 8, 11]],
  },
  {
    name: "Priya Nair",
    email: "priya.nair@coach.test",
    firm: "BCG",
    title: "Project Leader",
    yearsAtFirm: 5,
    headline: "Market entry & M&A cases are my specialty.",
    bio: "BCG Project Leader with 30+ candidates coached into offers. I go deep on the harder case archetypes — market entry, M&A, and due diligence — and help you handle ambiguous prompts with confidence.",
    focusAreas: ["market-entry", "ma", "structuring", "mock"],
    hourlyRate: 140,
    availability: "Thursday evenings & Saturdays (IST)",
    linkedinUrl: "https://www.linkedin.com/in/example-priya",
    timezone: "Asia/Kolkata",
    blocks: [[3, 17, 20], [5, 9, 13]],
  },
  {
    name: "Liam Walsh",
    email: "liam.walsh@coach.test",
    firm: "McKinsey",
    title: "Associate",
    yearsAtFirm: 2,
    headline: "Recently went through the loop — happy to pay it forward.",
    bio: "McKinsey Associate who just came through the recruiting process. I remember exactly what it felt like, and I run free mock interviews for first-generation and non-target candidates. Let's get your reps in.",
    focusAreas: ["math", "market-sizing", "behavioral", "networking"],
    hourlyRate: 0,
    availability: "Tue/Thu evenings & Sunday afternoons (PT)",
    linkedinUrl: null,
    timezone: "America/Los_Angeles",
    blocks: [[1, 19, 22], [3, 19, 22], [6, 14, 17]],
  },
  {
    name: "Sofia Rossi",
    email: "sofia.rossi@coach.test",
    firm: "Bain",
    title: "Manager",
    yearsAtFirm: 6,
    headline: "Former interviewer — I know what's on the other side of the table.",
    bio: "Bain Manager and active interviewer. I give the kind of blunt, specific feedback that actually moves your score: where your structure leaks, where your synthesis is mushy, and how to fix it before the real thing.",
    focusAreas: ["structuring", "profitability", "ma", "behavioral"],
    hourlyRate: 160,
    availability: "Tuesday evenings & Sunday mornings (CET)",
    linkedinUrl: "https://www.linkedin.com/in/example-sofia",
    timezone: "Europe/Paris",
    blocks: [[1, 18, 20], [6, 9, 12]],
  },
  {
    name: "Kenji Tanaka",
    email: "kenji.tanaka@coach.test",
    firm: "BCG",
    title: "Consultant",
    yearsAtFirm: 3,
    headline: "Calm, practical reps until cases feel routine.",
    bio: "BCG Consultant in Singapore. My style is low-pressure and rep-heavy — we'll work through enough cases together that the format stops being scary and you can focus on the actual thinking.",
    focusAreas: ["market-sizing", "math", "mock"],
    hourlyRate: 85,
    availability: "Mon/Wed/Fri midday (SGT)",
    linkedinUrl: null,
    timezone: "Asia/Singapore",
    blocks: [[0, 12, 15], [2, 12, 15], [4, 12, 15]],
  },
  {
    name: "Amara Diallo",
    email: "amara.diallo@coach.test",
    firm: "McKinsey",
    title: "Engagement Manager",
    yearsAtFirm: 5,
    headline: "PEI and storytelling — offers come down to fit too.",
    bio: "McKinsey EM who's seen strong case-solvers get dinged on the personal experience interview. I help you build a bank of sharp, structured stories so the behavioral round becomes a strength, not a coin flip.",
    focusAreas: ["behavioral", "networking", "mock", "structuring"],
    hourlyRate: 130,
    availability: "Weekend mornings (CT)",
    linkedinUrl: "https://www.linkedin.com/in/example-amara",
    timezone: "America/Chicago",
    blocks: [[5, 10, 13], [6, 10, 13]],
  },
  {
    name: "Tom Becker",
    email: "tom.becker@coach.test",
    firm: "Bain",
    title: "Consultant",
    yearsAtFirm: 2,
    headline: "Great for your first 10 cases — building the fundamentals.",
    bio: "Bain Consultant in Munich. If you're just starting out, I'm a friendly first coach: we'll cover the case fundamentals, profitability and market-entry basics, and get your mental math comfortable.",
    focusAreas: ["profitability", "market-entry", "math"],
    hourlyRate: 75,
    availability: "Tuesday & Thursday evenings (CET)",
    linkedinUrl: null,
    timezone: "Europe/Berlin",
    blocks: [[1, 17, 20], [3, 17, 20]],
  },
];

const students = [
  {
    name: "Jordan Lee",
    email: "jordan@student.test",
    targetFirms: ["McKinsey", "BCG"],
    focusAreas: ["structuring", "math"],
    timeline: "Interviewing in ~5 weeks",
    goal: "First-time case taker. I can get the math but my structures feel generic — I need to sound more like a real consultant.",
  },
  {
    name: "Sam Patel",
    email: "sam@student.test",
    targetFirms: ["Bain"],
    focusAreas: ["mock", "behavioral"],
    timeline: "Final round in 2 weeks",
    goal: "Made it to finals at Bain. Want intense full-length mocks and PEI polish.",
  },
];

function toBlockRows(coachId: number, blocks: number[][]) {
  return blocks.map(([weekday, startHour, endHour]) => ({
    coachId,
    weekday,
    startMinute: startHour * 60,
    endMinute: endHour * 60,
  }));
}

async function main() {
  await prisma.booking.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.student.deleteMany();

  let blockCount = 0;
  const createdCoaches = await Promise.all(
    coaches.map(async ({ blocks, focusAreas, ...rest }) => {
      const coach = await prisma.coach.create({
        data: { ...rest, focusAreas: serializeList(focusAreas) },
      });
      const rows = toBlockRows(coach.id, blocks);
      await prisma.availabilityBlock.createMany({ data: rows });
      blockCount += rows.length;
      return { coach, blocks };
    }),
  );

  const createdStudents = await Promise.all(
    students.map((s) =>
      prisma.student.create({
        data: {
          ...s,
          targetFirms: serializeList(s.targetFirms),
          focusAreas: serializeList(s.focusAreas),
        },
      }),
    ),
  );

  // Sample booking: Jordan books Maya's first available session this week.
  const maya = createdCoaches.find((c) => c.coach.name === "Maya Chen");
  const jordan = createdStudents.find((s) => s.name === "Jordan Lee");
  let bookingCount = 0;
  if (maya && jordan) {
    const now = new Date();
    const { lower, upper } = bookingWindow(now, maya.coach.timezone);
    const blocks = maya.blocks.map(([weekday, startHour, endHour]) => ({
      weekday,
      startMinute: startHour * 60,
      endMinute: endHour * 60,
    }));
    const [firstStart] = coachSessionStarts(blocks, lower, upper, maya.coach.timezone);
    if (firstStart) {
      await prisma.booking.create({
        data: {
          coachId: maya.coach.id,
          studentId: jordan.id,
          startTime: firstStart,
          durationMins: 60,
          focusArea: "structuring",
          pricePaid: maya.coach.hourlyRate,
          paymentStatus: "SIMULATED",
          paymentRef: "sim_seed_demo",
          status: "CONFIRMED",
        },
      });
      bookingCount = 1;
    }
  }

  console.log(
    `Seeded ${createdCoaches.length} coaches, ${createdStudents.length} students, ${blockCount} availability blocks, ${bookingCount} booking.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
