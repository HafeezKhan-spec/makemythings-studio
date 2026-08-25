import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { getStoreSettings } from "@/lib/catalog.functions";
import { SiteLogo } from "@/components/site/SiteLogo";

export function Footer() {
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getStoreSettings(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <footer className="mt-24 border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-5">
        <div className="space-y-3">
          <Link to="/">
            <SiteLogo variant="header" />
          </Link>
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

        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link to="/shipping-policy" className="hover:text-primary">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="hover:text-primary">
                Refund & Cancellation
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Reach us</h4>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> {settings?.business_email ?? "hello@MakeMyThing.in"}
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
        © {new Date().getFullYear()} MakeMyThing.in — You imagine it. We make it.
      </div>
    </footer>
  );
}
