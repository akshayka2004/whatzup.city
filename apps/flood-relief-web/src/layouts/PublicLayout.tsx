import { Outlet } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { EmergencyContactsTicker } from "@/components/EmergencyContactsTicker";

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <EmergencyContactsTicker />
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
