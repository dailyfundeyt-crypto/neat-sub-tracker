import logoAsset from "@/assets/hyperlite-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <img
        src={logoAsset.url}
        alt="HyperLite Logo"
        width={size}
        height={size}
        className="shrink-0 rounded-[28%]"
        style={{ width: size, height: size }}
      />
      <span
        className="truncate font-display font-bold tracking-tight text-foreground"
        style={{ fontSize: size * 0.62 }}
      >
        HyperLite
      </span>
    </div>
  );
}
