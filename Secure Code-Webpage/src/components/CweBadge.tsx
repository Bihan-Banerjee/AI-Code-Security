import { cn } from "@/lib/utils";
import { getCweName } from "@/lib/cwe";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/**
 * Renders "CWE-<id>" (as a link when a link is given). When the CWE id is known,
 * a tooltip shows what it is on hover. Unknown ids show no tooltip; a missing id
 * renders nothing.
 */
export default function CweBadge({
  id,
  link,
  className,
}: {
  id?: number | null;
  link?: string;
  className?: string;
}) {
  if (!id) return null;
  const name = getCweName(id);
  const label = `CWE-${id}`;
  const base = "font-medium text-primary underline-offset-2 hover:underline";

  const inner = link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={cn(base, className)}>
      {label}
    </a>
  ) : (
    <span className={cn(base, className)}>{label}</span>
  );

  if (!name) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <span className="font-medium">{label}</span> — {name}
      </TooltipContent>
    </Tooltip>
  );
}
