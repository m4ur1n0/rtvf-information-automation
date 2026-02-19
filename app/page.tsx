import { DashboardGrid } from "@/components/DashboardGrid";

export default function Home() {
  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Inbox</h1>
          </div>
          <p className="dashboard-subtitle">
            Film & TV production opportunities from the RTVF listserv
          </p>
        </div>
      </header>

      <DashboardGrid />
    </div>
  );
}
