import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Image,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SiteLogo } from "@/components/site/SiteLogo";

export const ADMIN_NAV = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "coupons", label: "Offers & Coupons", icon: Tag },
  { id: "banners", label: "Banners", icon: Image },
  { id: "requests", label: "Custom Requests", icon: Wrench },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Store Settings", icon: Settings },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>;

export type AdminSection = (typeof ADMIN_NAV)[number]["id"];

export function AdminShell({
  section,
  onSection,
  children,
  newOrderCount = 0,
  newRequestCount = 0,
}: {
  section: AdminSection;
  onSection: (s: AdminSection) => void;
  children: React.ReactNode;
  newOrderCount?: number;
  newRequestCount?: number;
}) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <Link to="/admin" className="flex items-center gap-2.5">
          <SiteLogo variant="mark" className="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="font-display text-lg font-extrabold">Admin</span>
        </Link>
        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSection(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.id === "orders" && newOrderCount > 0 ? (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {newOrderCount}
                  </span>
                ) : null}
                {item.id === "requests" && newRequestCount > 0 ? (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {newRequestCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export function AdminPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}
