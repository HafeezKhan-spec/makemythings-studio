import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/context/cart";
import { useAuth } from "@/hooks/useAuth";
import { SiteLogo } from "@/components/site/SiteLogo";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/custom-printing", label: "Custom Printing" },
  { to: "/offers", label: "Offers" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const search = term.trim();
    navigate({ to: "/shop", search: search ? { search } : {} });
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background p-6">
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                  activeProps={{ className: "bg-surface text-foreground" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                My Account
              </Link>
              <Link
                to="/orders"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                My Orders
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center">
          <SiteLogo variant="header" />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground bg-surface" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form onSubmit={submitSearch} className="hidden md:block">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search products…"
                className="w-48 rounded-full border-input bg-surface pl-9 lg:w-60"
                aria-label="Search products"
              />
            </div>
          </form>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Wishlist">
            <Link to="/wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Cart">
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-ember px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              ) : null}
            </Link>
          </Button>

          <Button asChild variant="ghost" size="icon" aria-label="Account">
            <Link to={user ? "/profile" : "/auth"}>
              <User className="h-5 w-5" />
            </Link>
          </Button>
          {user?.is_admin ? (
            <Button asChild variant="outline" size="sm" className="hidden rounded-full sm:inline-flex">
              <Link to="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {searchOpen ? (
        <form onSubmit={submitSearch} className="border-t border-border px-4 py-3 md:hidden">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products…"
            className="rounded-full bg-surface"
            aria-label="Search products"
          />
        </form>
      ) : null}
    </header>
  );
}
