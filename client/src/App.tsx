import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { BottomNav, type ViewKey } from "./components/BottomNav";
import { useRates } from "./hooks/useRates";
import { useSettings } from "./hooks/useSettings";
import { currentMonthString } from "./lib/format";
import { createMoney } from "./lib/money";
import { useRoute } from "./lib/navigation";
import { AddExpenseView } from "./views/AddExpenseView";
import { AdvisorView } from "./views/AdvisorView";
import { CommitmentsView } from "./views/CommitmentsView";
import { DashboardView } from "./views/DashboardView";
import { ExpenseListView } from "./views/ExpenseListView";
import { LandingView } from "./views/LandingView";
import { SettingsView } from "./views/SettingsView";

function Tracker() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [month, setMonth] = useState(currentMonthString());
  const { settings, refetch: refetchSettings } = useSettings();
  const { rates, refresh: refreshRates, refreshing } = useRates();
  const [dashboardKey, setDashboardKey] = useState(0);

  // One formatter for the whole tracker, so a currency change reaches every
  // amount at once instead of each view deciding for itself.
  const money = useMemo(() => createMoney(settings, rates), [settings, rates]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      {view === "dashboard" && (
        <DashboardView
          key={dashboardKey}
          month={month}
          money={money}
          onMonthChange={setMonth}
          onManageFixed={() => setView("fixed")}
        />
      )}
      {view === "add" && (
        <AddExpenseView
          month={month}
          base={money.base}
          onSaved={() => setDashboardKey((k) => k + 1)}
        />
      )}
      {view === "expenses" && (
        <ExpenseListView
          month={month}
          money={money}
          onMonthChange={setMonth}
          onChanged={() => setDashboardKey((k) => k + 1)}
        />
      )}
      {view === "fixed" && (
        <CommitmentsView money={money} onChanged={() => setDashboardKey((k) => k + 1)} />
      )}
      {view === "advisor" && <AdvisorView />}
      {view === "settings" && (
        <SettingsView
          month={month}
          settings={settings}
          money={money}
          rates={rates}
          refreshingRates={refreshing}
          onRefreshRates={refreshRates}
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

export default function App() {
  const route = useRoute();

  // The landing page is its own document-length scroll; jumping between it and
  // the tracker should start at the top rather than keep the old offset.
  useEffect(() => {
    globalThis.scrollTo({ top: 0 });
  }, [route]);

  return route === "app" ? <Tracker /> : <LandingView />;
}
