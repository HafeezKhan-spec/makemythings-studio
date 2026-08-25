type SiteLogoProps = {
  className?: string;
  variant?: "default" | "header" | "mark";
};

export function SiteLogo({ className, variant = "default" }: SiteLogoProps) {
  if (variant === "header") {
    return (
      <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
        <img
          src="/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg object-cover object-top sm:h-10 sm:w-10"
          width={40}
          height={40}
        />
        <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
          MakeMyThing<span className="text-gradient-ember">.in</span>
        </span>
      </span>
    );
  }

  if (variant === "mark") {
    return (
      <img
        src="/logo.png"
        alt="MakeMyThing"
        className={className ?? "h-9 w-9 rounded-lg object-cover object-top"}
        width={36}
        height={36}
      />
    );
  }

  return (
    <img
      src="/logo.png"
      alt="MakeMyThing — Made. Printed. Yours."
      className={className ?? "h-12 w-auto max-h-12 sm:h-14"}
      width={200}
      height={80}
    />
  );
}
