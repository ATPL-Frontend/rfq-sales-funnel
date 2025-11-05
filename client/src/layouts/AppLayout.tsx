import { Outlet } from "react-router-dom";
import AppNav from "../components/AppNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />
      <main className="p-4 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
