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
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-[26%]"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          src={logoAsset.url}
          alt="HyperLite Logo"
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
      <span
        className="truncate font-display font-bold tracking-tight text-foreground"
        style={{ fontSize: size * 0.62, lineHeight: 1.1 }}
      >
        HyperLite
      </span>
    </div>
  );
}
