import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Warehouse,
  Tent,
  HeartHandshake,
  Phone,
  UserCog,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/alerts", label: "Alerts", icon: Megaphone },
  { to: "/admin/collection-centres", label: "Collection Centres", icon: Warehouse },
  { to: "/admin/relief-camps", label: "Relief Camps", icon: Tent },
  { to: "/admin/volunteer-groups", label: "Volunteer Groups", icon: HeartHandshake },
  { to: "/admin/emergency-contacts", label: "Emergency Contacts", icon: Phone },
  { to: "/admin/users", label: "Users", icon: UserCog },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-64 flex-col bg-primary-950 text-primary-200">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-5">
        <div className="flex items-center gap-2.5 font-heading font-bold text-white">
          <ShieldAlert className="size-5 text-accent-400" aria-hidden="true" />
          <span className="text-sm leading-tight">Kerala Flood Relief<br />Admin Panel</span>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="cursor-pointer rounded-lg p-1.5 text-primary-300 hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-accent-600 text-white" : "text-primary-300 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
