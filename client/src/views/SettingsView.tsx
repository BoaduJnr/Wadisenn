import { useState, type FocusEvent, type FormEvent } from "react";
import { addAddOn, deleteAddOn, saveMonthRecord, saveSettings } from "../api";
import { useMonthRecord } from "../hooks/useMonthRecord";
import { monthLabel } from "../lib/format";
import { ratesAsOf, selectableCurrencies, type Money } from "../lib/money";
import type { RatesResponse, Settings } from "../types";

/**
 * Selects the contents when a field is showing a bare 0, so the first
 * keystroke replaces it instead of producing "07700".
 */
function selectIfZero(event: FocusEvent<HTMLInputElement>) {
  if (event.target.value === "0") event.target.select();
}

export function SettingsView({
  month,
  settings,
  money,
  rates,
  refreshingRates,
  onRefreshRates,
  onSettingsChanged,
}: {
  month: string;
  settings: Settings | null;
  money: Money;
  rates: RatesResponse | null;
  refreshingRates: boolean;
  onRefreshRates: () => void;
  onSettingsChanged: () => void;
}) {
  const { record, loading, refetch } = useMonthRecord(month);

  /*
   * null means the field has not been touched, so it shows whatever is
   * stored. An empty string means the user deliberately cleared it, which is
   * why these cannot be plain strings with a `||` fallback: that treats a
   * cleared field as untouched and instantly restores the old value, making
   * a stored 0 impossible to delete.
   */
  const [salaryInput, setSalaryInput] = useState<string | null>(null);
  const [currencyInput, setCurrencyInput] = useState<string | null>(null);
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryMessage, setSalaryMessage] = useState<string | null>(null);

  const [overrideInput, setOverrideInput] = useState<string | null>(null);
  const [defaultTargetInput, setDefaultTargetInput] = useState<string | null>(null);
  const [savingDefaultTarget, setSavingDefaultTarget] = useState(false);
  const [defaultTargetMessage, setDefaultTargetMessage] = useState<string | null>(null);

  const [targetInput, setTargetInput] = useState<string | null>(null);
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetMessage, setTargetMessage] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);

  const [addOnLabel, setAddOnLabel] = useState("");
  const [addOnAmount, setAddOnAmount] = useState("");
  const [savingAddOn, setSavingAddOn] = useState(false);

  const [savingDisplay, setSavingDisplay] = useState(false);

  const [tbillInput, setTbillInput] = useState<string | null>(null);
  const [inflationInput, setInflationInput] = useState<string | null>(null);
  const [loanAprInput, setLoanAprInput] = useState<string | null>(null);
  const [savingMarket, setSavingMarket] = useState(false);
  const [marketMessage, setMarketMessage] = useState<string | null>(null);

  const base = money.base;
  const effectiveSalaryInput = salaryInput ?? (settings ? String(settings.defaultMonthlySalary) : "");
  const effectiveCurrencyInput = currencyInput ?? base;
  const effectiveOverrideInput =
    overrideInput ?? (record?.salaryOverride !== undefined ? String(record.salaryOverride) : "");
  const effectiveTargetInput =
    targetInput ?? (record?.targetBudget !== undefined ? String(record.targetBudget) : "");
  const effectiveDefaultTargetInput =
    defaultTargetInput ?? (settings?.defaultTargetBudget !== undefined
      ? String(settings.defaultTargetBudget)
      : "");

  const market = settings?.marketContext;
  const numberOrBlank = (value?: number) => (value === undefined ? "" : String(value));
  const effectiveTbill = tbillInput ?? numberOrBlank(market?.tbillRate);
  const effectiveInflation = inflationInput ?? numberOrBlank(market?.inflation);
  const effectiveLoanApr = loanAprInput ?? numberOrBlank(market?.loanApr);

  const currencyOptions = selectableCurrencies(base, rates);
  const asOf = ratesAsOf(money.fetchedAt ?? rates?.fetchedAt ?? null);

  async function handleSaveSalary(e: FormEvent) {
    e.preventDefault();
    setSavingSalary(true);
    try {
      // Only this form's fields are sent; the server keeps everything else.
      await saveSettings({
        defaultMonthlySalary: Number(effectiveSalaryInput) || 0,
        currency: effectiveCurrencyInput || "GHS",
      });
      setSalaryInput(null);
      setCurrencyInput(null);
      onSettingsChanged();
      setSalaryMessage("Saved");
      setTimeout(() => setSalaryMessage(null), 1500);
    } finally {
      setSavingSalary(false);
    }
  }

  /** Display currency saves immediately — it is a view preference, not a form. */
  async function handleDisplayCurrency(code: string) {
    setSavingDisplay(true);
    try {
      // null clears the display currency; undefined would mean leave it alone.
      await saveSettings({ displayCurrency: code === base ? null : code });
      onSettingsChanged();
    } finally {
      setSavingDisplay(false);
    }
  }

  /**
   * The advisor has no live market data, so these are the only current rates it
   * is allowed to reason from. Sent without an updatedAt so the server stamps
   * today, marking them as freshly checked.
   */
  async function handleSaveMarket(e: FormEvent) {
    e.preventDefault();
    const parse = (value: string) => (value.trim() === "" ? undefined : Number(value));
    setSavingMarket(true);
    try {
      await saveSettings({
        marketContext: {
          tbillRate: parse(effectiveTbill),
          inflation: parse(effectiveInflation),
          loanApr: parse(effectiveLoanApr),
        },
      });
      setTbillInput(null);
      setInflationInput(null);
      setLoanAprInput(null);
      onSettingsChanged();
      setMarketMessage("Saved");
      setTimeout(() => setMarketMessage(null), 1500);
    } finally {
      setSavingMarket(false);
    }
  }

  /** Blank clears the default, leaving only per-month targets. */
  async function handleSaveDefaultTarget(e: FormEvent) {
    e.preventDefault();
    setSavingDefaultTarget(true);
    try {
      const value = effectiveDefaultTargetInput.trim();
      await saveSettings({ defaultTargetBudget: value === "" ? null : Number(value) });
      setDefaultTargetInput(null);
      onSettingsChanged();
      setDefaultTargetMessage("Saved");
      setTimeout(() => setDefaultTargetMessage(null), 1500);
    } finally {
      setSavingDefaultTarget(false);
    }
  }

  /**
   * Blank clears the target, which falls the pace indicator back to measuring
   * against the whole spendable budget. Only this field is sent, so saving it
   * cannot disturb the salary override or the add-ons.
   */
  async function handleSaveTarget(e: FormEvent) {
    e.preventDefault();
    setSavingTarget(true);
    try {
      const value = effectiveTargetInput.trim();
      await saveMonthRecord(month, { targetBudget: value === "" ? null : Number(value) });
      setTargetInput(null);
      refetch();
      onSettingsChanged();
      setTargetMessage("Saved");
      setTimeout(() => setTargetMessage(null), 1500);
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleSaveOverride(e: FormEvent) {
    e.preventDefault();
    setSavingOverride(true);
    try {
      const value = effectiveOverrideInput.trim();
      await saveMonthRecord(month, { salaryOverride: value === "" ? null : Number(value) });
      setOverrideInput(null);
      refetch();
    } finally {
      setSavingOverride(false);
    }
  }

  async function handleAddAddOn(e: FormEvent) {
    e.preventDefault();
    const amount = Number(addOnAmount);
    if (!addOnLabel || !Number.isFinite(amount) || amount <= 0) return;
    setSavingAddOn(true);
    try {
      await addAddOn(month, { label: addOnLabel, amount });
      setAddOnLabel("");
      setAddOnAmount("");
      refetch();
    } finally {
      setSavingAddOn(false);
    }
  }

  async function handleDeleteAddOn(id: string) {
    await deleteAddOn(month, id);
    refetch();
  }

  return (
    <div className="flex flex-col gap-4 px-safe pt-4 pb-nav max-w-md mx-auto">
      <h1 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        Setup
      </h1>

      <form
        onSubmit={handleSaveSalary}
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Default monthly salary
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Taken as your income every month, unless a month below says otherwise. Fixed costs come off this on
          the Fixed tab.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={effectiveSalaryInput}
            onChange={(e) => setSalaryInput(e.target.value)}
            onFocus={selectIfZero}
            className="h-11 flex-1 rounded-lg border px-3 font-display font-bold tabular-nums"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
          <input
            type="text"
            value={effectiveCurrencyInput}
            onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
            maxLength={3}
            aria-label="Base currency"
            className="h-11 w-16 rounded-lg border px-2 text-center font-semibold uppercase"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>
          That code is the currency your amounts are stored in. Changing it relabels everything you have
          already recorded — it does not convert it.
        </p>
        <button
          type="submit"
          disabled={savingSalary}
          className="h-11 rounded-lg font-display font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-brand)" }}
        >
          {salaryMessage ?? "Save"}
        </button>
      </form>

      <form
        onSubmit={handleSaveDefaultTarget}
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Default spending target
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          A ceiling on what you log each month, in {base}. Usually lower than what is spendable, so there
          is something left to keep. Any month can override it below. Blank measures your pace against the
          whole spendable budget instead.
        </p>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="No default target"
          value={effectiveDefaultTargetInput}
          onChange={(e) => setDefaultTargetInput(e.target.value)}
          onFocus={selectIfZero}
          className="h-11 rounded-lg border px-3 font-semibold tabular-nums"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={savingDefaultTarget}
          className="h-11 rounded-lg font-display font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-brand)" }}
        >
          {defaultTargetMessage ?? "Save default target"}
        </button>
      </form>

      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Show amounts in
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Converts every amount on screen at the latest rate. Nothing stored changes, and you still enter new
          amounts in {base}.
        </p>

        <select
          value={money.converting ? money.display : base}
          disabled={savingDisplay || currencyOptions.length <= 1}
          onChange={(e) => handleDisplayCurrency(e.target.value)}
          aria-label="Display currency"
          className="h-11 rounded-lg border px-3 font-semibold disabled:opacity-60"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          {currencyOptions.map((code) => (
            <option key={code} value={code}>
              {code === base ? `${code} — as stored` : code}
            </option>
          ))}
        </select>

        {money.converting && (
          <p className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
            1 {base} = {money.rate.toPrecision(6).replace(/\.?0+$/, "")} {money.display}
          </p>
        )}

        {money.unavailable && (
          <p className="text-xs font-medium" style={{ color: "var(--status-serious)" }}>
            No rate available for {settings?.displayCurrency} yet, so amounts are shown in {base}.
          </p>
        )}

        {rates && !rates.available && (
          <p className="text-xs" style={{ color: "var(--status-serious)" }}>
            Exchange rates could not be reached. Conversion will start working once you are back online.
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px]" style={{ color: money.stale ? "var(--status-warning)" : "var(--muted)" }}>
            {asOf ? `Rates from ${asOf}${money.stale ? " — out of date" : ""}` : "No rates cached yet"}
          </span>
          <button
            type="button"
            onClick={onRefreshRates}
            disabled={refreshingRates}
            className="h-9 shrink-0 rounded-lg border px-3 font-display text-xs font-semibold disabled:opacity-60"
            style={{ borderColor: "var(--border)", color: "var(--brand)" }}
          >
            {refreshingRates ? "Refreshing…" : "Refresh rates"}
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSaveMarket}
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Benchmark rates for the advisor
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          The advisor cannot look rates up, so it uses only what you put here. Fill these in from your bank or
          the Bank of Ghana and it can compare a loan or an investment against real numbers instead of asking.
        </p>

        <div className="flex flex-col gap-2">
          {[
            {
              label: "91-day Treasury bill (% a year)",
              value: effectiveTbill,
              onChange: setTbillInput,
              placeholder: "e.g. 26.5",
            },
            {
              label: "Inflation, year on year (%)",
              value: effectiveInflation,
              onChange: setInflationInput,
              placeholder: "e.g. 11.8",
            },
            {
              label: "Typical bank loan APR (%)",
              value: effectiveLoanApr,
              onChange: setLoanAprInput,
              placeholder: "e.g. 34",
            },
          ].map((field) => (
            <label key={field.label} className="flex items-center justify-between gap-3">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {field.label}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="1000"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onFocus={selectIfZero}
                placeholder={field.placeholder}
                className="h-10 w-24 shrink-0 rounded-lg border px-2 text-right font-semibold tabular-nums"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </label>
          ))}
        </div>

        {market?.updatedAt && (
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>
            Last checked {market.updatedAt}. Treasury bill yields reset weekly, so refresh these now and then.
          </p>
        )}

        <button
          type="submit"
          disabled={savingMarket}
          className="h-11 rounded-lg font-display font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-brand)" }}
        >
          {marketMessage ?? "Save rates"}
        </button>
      </form>

      <form
        onSubmit={handleSaveTarget}
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Spending target for {monthLabel(month)}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Overrides the default above, for this month only, in {base}. Blank uses{" "}
          {settings?.defaultTargetBudget !== undefined
            ? `the default of ${money.format(settings.defaultTargetBudget)}`
            : "your whole spendable budget"}.
        </p>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={settings?.defaultTargetBudget !== undefined
            ? String(settings.defaultTargetBudget)
            : "No target set"}
          value={effectiveTargetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          onFocus={selectIfZero}
          className="h-11 rounded-lg border px-3 font-semibold tabular-nums"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={savingTarget || loading}
          className="h-11 rounded-lg font-display font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-brand)" }}
        >
          {targetMessage ?? "Save target"}
        </button>
      </form>

      <form
        onSubmit={handleSaveOverride}
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Salary override for {monthLabel(month)}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Blank means this month uses the default above. In {base}.
        </p>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={settings ? String(settings.defaultMonthlySalary) : "0"}
          value={effectiveOverrideInput}
          onChange={(e) => setOverrideInput(e.target.value)}
          onFocus={selectIfZero}
          className="h-11 rounded-lg border px-3 font-semibold tabular-nums"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={savingOverride || loading}
          className="h-11 rounded-lg font-display font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-brand)" }}
        >
          Save override
        </button>
      </form>

      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          One-off income for {monthLabel(month)}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Money that only arrived this month — a bonus, an invoice, a gift. In {base}.
        </p>

        {record?.addOns.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {a.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                {money.format(a.amount)}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteAddOn(a.id)}
                aria-label={`Remove ${a.label}`}
                className="h-8 w-8 flex items-center justify-center rounded-full"
                style={{ color: "var(--status-critical)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <form onSubmit={handleAddAddOn} className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Label"
            value={addOnLabel}
            onChange={(e) => setAddOnLabel(e.target.value)}
            className="h-11 flex-1 min-w-0 rounded-lg border px-3"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder={base}
            value={addOnAmount}
            onChange={(e) => setAddOnAmount(e.target.value)}
            className="h-11 w-24 rounded-lg border px-3"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
          <button
            type="submit"
            disabled={savingAddOn}
            aria-label="Add one-off income"
            className="h-11 w-11 shrink-0 rounded-lg font-display font-semibold disabled:opacity-60"
            style={{ background: "var(--accent)", color: "var(--on-brand)" }}
          >
            +
          </button>
        </form>
      </div>
    </div>
  );
}
