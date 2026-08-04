import { cn } from "@/lib/utils";

const logoSrc = "/connect-logo.svg";

export function Wordmark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-[26%]"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          src={logoSrc}
          alt="Connect Logo"
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
      <span
        className="truncate font-display font-bold tracking-tight text-foreground"
        style={{ fontSize: size * 0.62, lineHeight: 1.1 }}
      >
        Connect
      </span>
    </div>
  );
}
