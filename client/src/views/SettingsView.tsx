import { useState, type FormEvent } from "react";
import { addAddOn, deleteAddOn, saveMonthRecord, saveSettings } from "../api";
import { useMonthRecord } from "../hooks/useMonthRecord";
import { formatCurrency, monthLabel } from "../lib/format";
import type { Settings } from "../types";

export function SettingsView({
  month,
  settings,
  onSettingsChanged,
}: {
  month: string;
  settings: Settings | null;
  onSettingsChanged: () => void;
}) {
  const { record, loading, refetch } = useMonthRecord(month);

  const [salaryInput, setSalaryInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryMessage, setSalaryMessage] = useState<string | null>(null);

  const [overrideInput, setOverrideInput] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const [addOnLabel, setAddOnLabel] = useState("");
  const [addOnAmount, setAddOnAmount] = useState("");
  const [savingAddOn, setSavingAddOn] = useState(false);

  const currency = settings?.currency ?? "GHS";
  const effectiveSalaryInput = salaryInput || (settings ? String(settings.defaultMonthlySalary) : "");
  const effectiveCurrencyInput = currencyInput || currency;
  const effectiveOverrideInput = overrideInput || (record?.salaryOverride !== undefined ? String(record.salaryOverride) : "");

  async function handleSaveSalary(e: FormEvent) {
    e.preventDefault();
    setSavingSalary(true);
    try {
      await saveSettings({
        defaultMonthlySalary: Number(effectiveSalaryInput) || 0,
        currency: effectiveCurrencyInput || "GHS",
      });
      onSettingsChanged();
      setSalaryMessage("Saved");
      setTimeout(() => setSalaryMessage(null), 1500);
    } finally {
      setSavingSalary(false);
    }
  }

  async function handleSaveOverride(e: FormEvent) {
    e.preventDefault();
    setSavingOverride(true);
    try {
      const value = effectiveOverrideInput.trim();
      await saveMonthRecord(month, {
        salaryOverride: value === "" ? null : Number(value),
        addOns: record?.addOns ?? [],
      });
      setOverrideInput("");
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
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24 max-w-md mx-auto">
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        Settings
      </h1>

      <form
        onSubmit={handleSaveSalary}
        className="rounded-2xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Default monthly salary
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Assumed every month unless you set an override below for a specific month.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={effectiveSalaryInput}
            onChange={(e) => setSalaryInput(e.target.value)}
            className="h-11 flex-1 rounded-xl border px-3 font-semibold tabular-nums"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "transparent" }}
          />
          <input
            type="text"
            value={effectiveCurrencyInput}
            onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
            maxLength={3}
            className="h-11 w-16 rounded-xl border px-2 text-center font-semibold uppercase"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "transparent" }}
          />
        </div>
        <button
          type="submit"
          disabled={savingSalary}
          className="h-11 rounded-xl font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--series-1)" }}
        >
          {salaryMessage ?? "Save"}
        </button>
      </form>

      <form
        onSubmit={handleSaveOverride}
        className="rounded-2xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Salary override for {monthLabel(month)}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Leave blank to use the default salary for this month.
        </p>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={settings ? String(settings.defaultMonthlySalary) : "0"}
          value={effectiveOverrideInput}
          onChange={(e) => setOverrideInput(e.target.value)}
          className="h-11 rounded-xl border px-3 font-semibold tabular-nums"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "transparent" }}
        />
        <button
          type="submit"
          disabled={savingOverride || loading}
          className="h-11 rounded-xl font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--series-1)" }}
        >
          Save override
        </button>
      </form>

      <div
        className="rounded-2xl border p-4 flex flex-col gap-3"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Add-ons for {monthLabel(month)}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Extra income for this month only — bonus, freelance, gifts, etc.
        </p>

        {record?.addOns.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {a.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                {formatCurrency(a.amount, currency)}
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
            className="h-11 flex-1 min-w-0 rounded-xl border px-3"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "transparent" }}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={addOnAmount}
            onChange={(e) => setAddOnAmount(e.target.value)}
            className="h-11 w-24 rounded-xl border px-3"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "transparent" }}
          />
          <button
            type="submit"
            disabled={savingAddOn}
            aria-label="Add add-on"
            className="h-11 w-11 shrink-0 rounded-xl font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--series-1)" }}
          >
            +
          </button>
        </form>
      </div>
    </div>
  );
}
