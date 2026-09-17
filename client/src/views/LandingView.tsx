import type { ReactNode } from "react";
import { Faq, type FaqEntry } from "../components/landing/Faq";
import { AdvisorMock, DashboardMock, FixedMock, HistoryMock, IncomeMock, LogMock } from "../components/landing/Mocks";
import {
  AnchorButton,
  BulletList,
  Check,
  Eyebrow,
  Glow,
  OpenAppButton,
  StepNumber,
  Wordmark,
} from "../components/landing/Primitives";
import { navigate } from "../lib/navigation";

const STEPS = [
  {
    title: "Say what comes in",
    body: "One default salary, set once. Add a bonus or an invoice to the month it actually landed in, and only that month changes.",
  },
  {
    title: "List what is already promised",
    body: "Rent, data, electricity, a yearly insurance premium. Each one is deducted on its own schedule — every month, or in the month it falls due.",
  },
  {
    title: "Spend from what survived",
    body: "Log as you go. The budget you are drawing down is the discretionary slice left after step two, never your gross salary.",
  },
  {
    title: "Read the month early",
    body: "A projection from the pace you are actually on, measured against that same slice. You find out on the 12th, not the 30th.",
  },
];

const FEATURES: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  mock: ReactNode;
  flip?: boolean;
}[] = [
  {
    eyebrow: "Fixed costs",
    title: "Rent comes out before anything else does",
    body: "Some money is spent the moment it arrives. Put your standing costs in once — monthly or yearly, with a start and an end — and Wadisenn subtracts them from every month they touch. You never have to remember to log rent, and you never budget with money that was already gone.",
    bullets: [
      "Monthly costs deducted from every month in range",
      "Yearly costs charged in full in the month they fall due",
      "Or spread a yearly bill a twelfth at a time, so no month takes the whole hit",
      "A twelve-month strip showing exactly where the year gets lumpy",
    ],
    mock: <FixedMock />,
  },
  {
    eyebrow: "Advisor",
    title: "Ask someone who has actually seen your numbers",
    body: "Most money advice is generic because whoever wrote it has never seen your figures. Wadisenn’s advisor reads your real income, your standing costs, what you have kept and where your spending goes — then answers for Ghana, not for somewhere else.",
    bullets: [
      "Purchases checked against what is genuinely free this month",
      "Loans annualised and weighed against a Treasury bill and your own surplus",
      "Lending to family treated as the social question it actually is",
      "Rent advances, susu, T-bills, MoMo and licensed-institution checks",
    ],
    mock: <AdvisorMock />,
    flip: true,
  },
  {
    eyebrow: "The month",
    title: "One statement, read top to bottom",
    body: "Income, then each deduction in the order it applies, then two ruled subtotals: what was spendable once the fixed costs came out, and what is still there. No tile grid to decode — the arithmetic is written down the page.",
    bullets: [
      "Income, fixed monthly, fixed yearly, spent, left",
      "A projection to month end at your current pace",
      "Spending charted against the budget that survived the fixed costs",
    ],
    mock: <DashboardMock />,
  },
  {
    eyebrow: "Income",
    title: "Set the salary once, handle the odd month when it comes",
    body: "Most months are the same, so you set a default and Wadisenn assumes it. When a month differs — a raise, a short month, a freelance payment — you override the salary or add a one-off, and nothing else moves.",
    bullets: [
      "One default monthly salary, assumed every month",
      "A per-month override for the months that differ",
      "One-off income lands only in the month it happened",
    ],
    mock: <IncomeMock />,
    flip: true,
  },
  {
    eyebrow: "Logging",
    title: "Five seconds per spend, and a shorter list to log",
    body: "Amount, category, date, an optional note. Because the standing costs are already handled, the only things left to log are the ones you actually decided on that day. Entries group by day with a running total; tap any of them to edit.",
    bullets: [
      "Amount, category, date and an optional note",
      "Seven colour-coded categories",
      "Grouped by day, tap any entry to change it",
    ],
    mock: <LogMock />,
  },
  {
    eyebrow: "History",
    title: "See which part of the month you can actually move",
    body: "Every finished month becomes one bar, split three ways: the fixed costs that never budge, the discretionary spending on top, and what was still there at the end. Put side by side, it is obvious which band responds to effort.",
    bullets: [
      "Fixed, spent and kept, stacked to that month's income",
      "Six months side by side",
      "The months you went past the budget, flagged in red",
    ],
    mock: <HistoryMock />,
    flip: true,
  },
];

const EXTRAS = [
  {
    title: "Spread a yearly bill",
    body: "A GHS 1,800 premium can land whole in March, or reserve GHS 150 a month so March feels like every other month. Your choice, per bill.",
    chip: "GHS 150 / month",
  },
  {
    title: "End-date a commitment",
    body: "Give a fixed cost a last month and it stops being deducted after it. Old rent stays in the months it belonged to instead of rewriting your history.",
    chip: "Until 2026-08",
  },
  {
    title: "Installs from the browser",
    body: "Add Wadisenn to your home screen and it opens full-screen like any other app. No store listing, no download queue, no update prompts.",
    chip: "Add to Home Screen",
  },
];

const IDEAS = [
  {
    title: "Promised money is not spare money",
    body: "Your salary lands in one lump, but part of it belongs to the landlord before you touch it. A number that ignores that is not a budget, it is a balance.",
  },
  {
    title: "A year is not twelve equal months",
    body: "Renewals, premiums and school fees arrive once and hurt once. Either plan for the lump or flatten it — but decide, rather than get surprised.",
  },
  {
    title: "The useful number is boring",
    body: "Not what you earn, not what you spent. What is left of the part you were free to spend, today, after everything already counted.",
  },
  {
    title: "Only the middle band moves",
    body: "Fixed costs change once a year, if that. Everything you can actually influence sits between them and what you keep — so that is what to watch.",
  },
];

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "What is Wadisenn?",
    answer:
      "A mobile-first spending tracker built around the fact that some of your income is already committed. You set your salary, list the fixed costs that repeat, and log the rest as you go. Wadisenn works out what is genuinely free to spend, where the month is heading, and how much you managed to keep.",
  },
  {
    question: "What counts as a fixed cost?",
    answer:
      "Anything that repeats on a schedule instead of being a decision you make on the day: rent, electricity, water, internet, a phone plan, a subscription, a loan repayment, an annual insurance premium or licence renewal. If you would have logged the same amount every month anyway, it belongs here.",
  },
  {
    question: "How are yearly costs handled?",
    answer:
      "Two ways, chosen per cost. By default a yearly cost is deducted in full in the month it falls due, so that month shows the real squeeze. Tick “spread” instead and Wadisenn holds back a twelfth of it every month, which keeps each month even and means the money is notionally set aside by the time the bill lands.",
  },
  {
    question: "Should I also log rent as an expense?",
    answer:
      "No — that would count it twice. A fixed cost is deducted from your income automatically, before any logged spending is counted. The expense log is only for the spending you decide on day to day.",
  },
  {
    question: "What happens when my rent changes?",
    answer:
      "Give the old one an end month and add the new one starting the month after. Each month is then summarised with the costs that were true at the time, so raising your rent today does not rewrite what last year looked like.",
  },
  {
    question: "What does the advisor actually do?",
    answer:
      "It answers money questions using your own recorded figures rather than general rules — whether a purchase fits this month, whether a loan is worth taking, where to put savings, what to do when a relative asks to borrow. It does the arithmetic against your real income, fixed costs and history, and it reasons about Ghanaian conditions: Treasury bills as the benchmark, rent advances, susu and credit unions, mobile money charges, and checking that any institution is licensed by the Bank of Ghana or the SEC.",
  },
  {
    question: "Does the advisor know today’s Treasury bill rate?",
    answer:
      "No, and it will not pretend to. It has no live market data, so it is instructed never to state a current rate, inflation figure or levy as fact. Instead you can enter the benchmark rates you have checked — the 91-day Treasury bill, inflation, a typical loan APR — in Setup, and it reasons against those. Anything it needs and does not have, it asks you for, or tells you where to check.",
  },
  {
    question: "Is my data sent anywhere when I use the advisor?",
    answer:
      "Yes, and only then. To answer a question it sends a summary of your figures — income, fixed costs, monthly totals and category breakdown — to Google’s Gemini API. You can see that summary in full before asking, on the Advice tab. If you never open the advisor, or the server has no API key configured, nothing leaves your instance at all. Every other part of Wadisenn works without it.",
  },
  {
    question: "Is this financial advice?",
    answer:
      "No. It is general guidance from a tool, not advice from a licensed adviser, and it can be wrong. Treat it as a well-informed second opinion that happens to know your numbers. For anything large, irreversible or tax-sensitive, confirm it with a SEC-licensed adviser or a qualified tax professional.",
  },
  {
    question: "Does it connect to my bank?",
    answer:
      "No. Wadisenn never connects to a bank and never holds or moves money. Nothing is recorded that you did not enter yourself.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "In your own Wadisenn instance. Run locally, everything sits in a database file on your machine; deployed, it sits in the key-value store of the deployment you control. Nothing is shared with anyone else, with one exception you control: asking the advisor a question sends a summary of your figures to Google’s Gemini API, as described above.",
  },
  {
    question: "Is it free, and is there an account?",
    answer: "It is free, and there is no account to create. Open it and start.",
  },
  {
    question: "Can I change the currency?",
    answer: "Yes, it is a setting, and every amount in the app is formatted with it. It defaults to GHS.",
  },
];

function Section({
  children,
  className,
  id,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "default" | "subtle" | "ink";
}) {
  const background =
    tone === "ink" ? undefined : tone === "subtle" ? "var(--surface-2)" : "var(--page-plane)";
  return (
    <section
      id={id}
      className={`relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 ${tone === "ink" ? "ink" : ""} ${className ?? ""}`}
      style={{ background }}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  center = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 ${center ? "mx-auto max-w-2xl items-center text-center" : "items-start"}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-3xl font-extrabold sm:text-4xl" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {body && (
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {body}
        </p>
      )}
    </div>
  );
}

const NAV_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Install", href: "#install" },
  { label: "FAQ", href: "#faq" },
];

function Header() {
  return (
    <header
      className="pane-top sticky top-0 z-20 border-b backdrop-blur-lg"
      style={{ background: "var(--header-plane)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="px-safe mx-auto flex h-16 max-w-6xl items-center justify-between sm:px-6">
        <Wordmark onDark />
        <nav className="flex items-center gap-1 sm:gap-5">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hidden px-2 text-sm font-medium sm:block"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {link.label}
            </a>
          ))}
          <OpenAppButton size="sm">Open app</OpenAppButton>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="ink relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
      <Glow className="-top-28 -left-24" size={460} opacity={0.34} />
      <Glow className="top-40 -right-20" size={420} opacity={0.24} />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="reveal flex flex-col items-start gap-6">
          <Eyebrow>Fixed costs first</Eyebrow>
          <h1 className="font-display text-4xl leading-[1.08] font-extrabold sm:text-5xl lg:text-6xl">
            The money you can spend
            <br />
            <span style={{ color: "var(--brand)" }}>is not the money you earn</span>.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed" style={{ color: "var(--ink-text-secondary)" }}>
            Rent, electricity, data, that yearly premium — all of it is promised before the month even starts.
            Wadisenn takes the standing costs out first, then tracks what is genuinely yours to spend.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <OpenAppButton size="lg" />
            <AnchorButton href="#how">How a month works</AnchorButton>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Free &middot; No bank connection &middot; The advisor is optional
          </p>
        </div>
        <div className="reveal flex justify-center lg:justify-end">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <Section id="how" tone="subtle">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Four steps"
          title="How a month works"
          body="Nothing here is automatic guesswork. Each step is something you tell Wadisenn once, and it applies every month after."
        />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-xl border p-6"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <StepNumber n={index + 1} />
                <h3 className="font-display text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

function Features() {
  return (
    <div id="features">
      {FEATURES.map((feature, index) => (
        <Section key={feature.title} tone={index % 2 === 0 ? "default" : "subtle"}>
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className={`flex flex-col gap-5 ${feature.flip ? "lg:order-2" : ""}`}>
              <SectionHeading eyebrow={feature.eyebrow} title={feature.title} body={feature.body} center={false} />
              <BulletList items={feature.bullets} />
            </div>
            <div className={`flex justify-center ${feature.flip ? "lg:order-1 lg:justify-start" : "lg:justify-end"}`}>
              {feature.mock}
            </div>
          </div>
        </Section>
      ))}
    </div>
  );
}

function Extras() {
  return (
    <Section>
      <div className="mx-auto max-w-6xl">
        <SectionHeading title="Smaller things that matter" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {EXTRAS.map((extra) => (
            <div
              key={extra.title}
              className="flex flex-col gap-3 rounded-xl border p-6"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <h3 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {extra.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {extra.body}
              </p>
              <span
                className="mt-auto inline-flex w-fit rounded-md px-2.5 py-1.5 font-display text-xs font-semibold tabular-nums"
                style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
              >
                {extra.chip}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Ideas() {
  return (
    <Section tone="ink">
      <Glow className="-bottom-32 left-1/3" size={380} opacity={0.2} />
      <div className="relative mx-auto max-w-5xl">
        <SectionHeading eyebrow="The thinking" title="Four ideas it is built on" />
        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {IDEAS.map((idea) => (
            <div
              key={idea.title}
              className="flex flex-col gap-2 border-l-2 pl-5"
              style={{ borderColor: "var(--brand)" }}
            >
              <h3 className="font-display text-base font-bold" style={{ color: "var(--ink-text)" }}>
                {idea.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-text-secondary)" }}>
                {idea.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function WhyItExists() {
  return (
    <Section tone="subtle">
      <div className="mx-auto max-w-3xl">
        <SectionHeading title="Why it exists" />
        {/* Real user reviews belong here once there are some — the honest version
            of the same section until then. */}
        <div
          className="mt-12 border-l-2 pl-6 sm:pl-8"
          style={{ borderColor: "var(--brand)" }}
        >
          <p className="text-lg leading-relaxed" style={{ color: "var(--text-primary)" }}>
            The salary would land, the month would feel fine for two weeks, and then it would not. The spending was
            never wild. The problem was that a third of it was gone on arrival — rent, bills, the renewal I had
            forgotten was annual — and nothing ever said so out loud. So the number I was spending against had been
            wrong the whole time.
          </p>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Wadisenn is the small, unexciting tool that takes those out first and answers one question properly:
            after everything already committed and everything already spent, what is actually left?
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {["No bank connection", "Your data stays yours", "Free to use"].map((item) => (
            <span
              key={item}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Check />
              {item}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Install() {
  const platforms = [
    { name: "iPhone / iPad", steps: ["Open Wadisenn in Safari", "Tap the Share button", "Choose “Add to Home Screen”"] },
    { name: "Android", steps: ["Open Wadisenn in Chrome", "Tap the ⋮ menu", "Tap “Install app”"] },
  ];
  return (
    <Section id="install">
      <div className="relative mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="Install"
          title="Put it on your phone"
          body="Wadisenn installs straight from the browser and runs like a normal app. Once added it opens full-screen on its own."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="rounded-xl border p-6"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <h3 className="font-display text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {platform.name}
              </h3>
              <ol className="mt-4 flex flex-col gap-3">
                {platform.steps.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-center gap-3 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold"
                      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3">
          <OpenAppButton size="lg" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            On a computer? It works just as well in the browser.
          </p>
        </div>
      </div>
    </Section>
  );
}

function FaqSection() {
  return (
    <Section id="faq" tone="subtle">
      <div className="mx-auto max-w-3xl">
        <SectionHeading title="Questions, answered" />
        <div className="mt-12">
          <Faq entries={FAQ_ENTRIES} />
        </div>
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <section className="ink relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20">
      <Glow className="-top-20 left-1/2" size={420} opacity={0.26} />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl" style={{ color: "var(--ink-text)" }}>
          Find out what is actually yours this month
        </h2>
        <p className="text-base leading-relaxed" style={{ color: "var(--ink-text-secondary)" }}>
          Set your salary, list the costs that repeat, log one spend. About a minute, and the number stops being a
          guess.
        </p>
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="inline-flex h-14 items-center justify-center rounded-lg px-8 font-display text-base font-bold transition-transform active:scale-[0.98]"
          style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        >
          Start with your rent
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ink px-4 py-12 sm:px-6" style={{ background: "var(--deep)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark onDark />
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium"
                style={{ color: "var(--ink-text-secondary)" }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          Wadisenn is a tool for organising your own financial information, and its advisor offers general
          guidance only. It never holds or moves your money, and it is not a substitute for advice from a
          licensed financial adviser or a qualified tax professional.
        </p>
        <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
          &copy; {new Date().getFullYear()} Wadisenn. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function LandingView() {
  return (
    <div style={{ background: "var(--page-plane)" }}>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Extras />
        <Ideas />
        <WhyItExists />
        <Install />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
