import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getStoreSettings } from "@/lib/catalog.functions";

export function Footer() {
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getStoreSettings(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <footer className="mt-24 border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <span className="font-display text-lg font-extrabold">
            MakeMyThings<span className="text-gradient-ember">.in</span>
          </span>
          <p className="text-sm text-muted-foreground">
            Custom 3D printing studio for collectibles, décor and one-of-a-kind gifts. Designed and
            printed in India.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:text-primary">
                All products
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-primary">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/offers" className="hover:text-primary">
                Offers
              </Link>
            </li>
            <li>
              <Link to="/custom-printing" className="hover:text-primary">
                Custom printing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Help</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/orders" className="hover:text-primary">
                Track my order
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact us
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-primary">
                About us
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Reach us</h4>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> {settings?.business_email ?? "hello@makemythings.in"}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> {settings?.business_phone ?? "+91 98765 43210"}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />{" "}
            {settings?.business_address ?? "Bengaluru, India"}
          </p>
          {settings?.instagram_url ? (
            <a
              href={settings.instagram_url}
              className="flex items-center gap-2 hover:text-primary"
              rel="noreferrer"
              target="_blank"
            >
              <Instagram className="h-4 w-4 text-primary" /> Instagram
            </a>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MakeMyThings.in — You imagine it. We make it.
      </div>
    </footer>
  );
}
