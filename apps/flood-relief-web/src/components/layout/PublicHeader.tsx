import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, ShieldAlert } from "lucide-react";
import { cn } from "@/utils/cn";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/alerts", label: "Alerts" },
  { to: "/collection-centres", label: "Collection Centres" },
  { to: "/relief-camps", label: "Relief Camps" },
  { to: "/volunteer-groups", label: "Volunteer Groups" },
  { to: "/emergency-contacts", label: "Emergency Contacts" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2.5 font-heading font-bold text-primary-900" onClick={() => setOpen(false)}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-900 text-white">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            Kerala Flood
            <br className="sm:hidden" /> Relief Portal
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary-100 text-primary-900" : "text-primary-600 hover:bg-primary-50 hover:text-primary-900"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg text-primary-700 hover:bg-primary-50 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border-subtle bg-white lg:hidden" aria-label="Primary mobile">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive ? "bg-primary-100 text-primary-900" : "text-primary-600"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
