import { useState } from "react";
import { BottomNav, type ViewKey } from "./components/BottomNav";
import { useSettings } from "./hooks/useSettings";
import { currentMonthString } from "./lib/format";
import { AddExpenseView } from "./views/AddExpenseView";
import { DashboardView } from "./views/DashboardView";
import { ExpenseListView } from "./views/ExpenseListView";
import { SettingsView } from "./views/SettingsView";

export default function App() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [month, setMonth] = useState(currentMonthString());
  const { settings, refetch: refetchSettings } = useSettings();
  const [dashboardKey, setDashboardKey] = useState(0);

  const currency = settings?.currency ?? "GHS";

  return (
    <div className="min-h-screen">
      {view === "dashboard" && (
        <DashboardView key={dashboardKey} month={month} currency={currency} onMonthChange={setMonth} />
      )}
      {view === "add" && <AddExpenseView month={month} onSaved={() => setDashboardKey((k) => k + 1)} />}
      {view === "expenses" && (
        <ExpenseListView
          month={month}
          currency={currency}
          onMonthChange={setMonth}
          onChanged={() => setDashboardKey((k) => k + 1)}
        />
      )}
      {view === "settings" && (
        <SettingsView
          month={month}
          settings={settings}
          onSettingsChanged={() => {
            refetchSettings();
            setDashboardKey((k) => k + 1);
          }}
        />
      )}
      <BottomNav active={view} onChange={setView} />
    </div>
  );
}
