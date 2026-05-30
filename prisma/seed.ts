import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { serializeList } from "@/lib/format";

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
    availability: "Weeknights & Sunday afternoons (ET)",
    linkedinUrl: "https://www.linkedin.com/in/example-maya",
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
    availability: "Weekday mornings (GMT)",
    linkedinUrl: null,
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
    availability: "Saturdays (CET)",
    linkedinUrl: "https://www.linkedin.com/in/example-priya",
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
    availability: "Flexible, evenings (ET)",
    linkedinUrl: null,
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
    availability: "Sunday mornings (CET)",
    linkedinUrl: "https://www.linkedin.com/in/example-sofia",
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
    availability: "Weeknights (SGT)",
    linkedinUrl: null,
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
    availability: "Weekends (ET)",
    linkedinUrl: "https://www.linkedin.com/in/example-amara",
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

// 5 slots per coach across the next week, at varied hours (UTC).
const SLOT_HOURS = [9, 11, 14, 16, 18];

function slotTime(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  // Idempotent reset (FK-safe order).
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.student.deleteMany();

  const createdCoaches = await Promise.all(
    coaches.map((c) =>
      prisma.coach.create({
        data: { ...c, focusAreas: serializeList(c.focusAreas) },
      }),
    ),
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

  let slotCount = 0;
  for (let ci = 0; ci < createdCoaches.length; ci++) {
    const coach = createdCoaches[ci];
    for (let k = 0; k < SLOT_HOURS.length; k++) {
      const dayOffset = ((ci + k) % 6) + 1; // 1..6 days out
      await prisma.slot.create({
        data: { coachId: coach.id, startTime: slotTime(dayOffset, SLOT_HOURS[k]) },
      });
      slotCount++;
    }
  }

  // A sample booking so dashboards aren't empty: Jordan books Maya's first slot.
  const maya = createdCoaches.find((c) => c.name === "Maya Chen");
  const jordan = createdStudents.find((s) => s.name === "Jordan Lee");
  if (maya && jordan) {
    const slot = await prisma.slot.findFirst({
      where: { coachId: maya.id, isBooked: false },
      orderBy: { startTime: "asc" },
    });
    if (slot) {
      await prisma.$transaction([
        prisma.slot.update({ where: { id: slot.id }, data: { isBooked: true } }),
        prisma.booking.create({
          data: {
            slotId: slot.id,
            studentId: jordan.id,
            coachId: maya.id,
            focusArea: "structuring",
            pricePaid: maya.hourlyRate,
            paymentStatus: "SIMULATED",
            paymentRef: "sim_seed_demo",
            status: "CONFIRMED",
          },
        }),
      ]);
    }
  }

  console.log(
    `Seeded ${createdCoaches.length} coaches, ${createdStudents.length} students, ${slotCount} slots, 1 sample booking.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
