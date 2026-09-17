import { useState } from "react";
import { createExpense } from "../api";
import { ExpenseForm, type ExpenseFormValues } from "../components/ExpenseForm";

export function AddExpenseView({
  month,
  base,
  onSaved,
}: {
  month: string;
  base: string;
  onSaved: () => void;
}) {
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function handleSave(values: ExpenseFormValues) {
    await createExpense(month, values);
    setConfirmation("Logged");
    onSaved();
    setTimeout(() => setConfirmation(null), 2000);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28 max-w-md mx-auto">
      {confirmation && (
        <div
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-center"
          style={{ background: "var(--status-good)", color: "white" }}
        >
          {confirmation}
        </div>
      )}
      <ExpenseForm base={base} onSave={handleSave} />
    </div>
  );
}
