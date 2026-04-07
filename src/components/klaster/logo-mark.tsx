import { cn } from "@/lib/utils";

type KlasterLogoMarkProps = {
  className?: string;
};

export function KlasterLogoMark({ className }: KlasterLogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-8 w-10 shrink-0 text-foreground", className)}
      fill="none"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      >
        <path d="M58 32C63 41 67 41 72 32" />
        <path d="M44 70C38 79 39 87 48 94" />
        <path d="M84 70C90 79 89 87 80 94" />
      </g>

      <g fill="currentColor">
        <circle cx="50" cy="28" r="13" />
        <circle cx="78" cy="28" r="13" />
        <circle cx="38" cy="62" r="13" />
        <circle cx="50" cy="96" r="13" />
        <circle cx="90" cy="62" r="13" />
        <circle cx="78" cy="96" r="13" />
      </g>
    </svg>
  );
}
