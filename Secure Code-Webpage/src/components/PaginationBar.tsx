import { cn } from "@/lib/utils";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
} from "@/components/ui/pagination";

function pageWindow(current: number, count: number): (number | "ellipsis")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(count - 1, current + 1);
  if (left > 2) out.push("ellipsis");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < count - 1) out.push("ellipsis");
  out.push(count);
  return out;
}

/**
 * Compact, reusable pager. Renders nothing when everything fits on one page.
 * Shows "a–b of n" plus prev / numbered / next controls.
 */
export default function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  itemLabel = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  className?: string;
  itemLabel?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const clamped = Math.min(Math.max(1, page), pageCount);
  const from = (clamped - 1) * pageSize + 1;
  const to = Math.min(total, clamped * pageSize);
  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), pageCount));

  return (
    <div className={cn("mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between", className)}>
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total} {itemLabel}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => go(clamped - 1)}
              className={cn("cursor-pointer select-none", clamped === 1 && "pointer-events-none opacity-40")}
            />
          </PaginationItem>
          {pageWindow(clamped, pageCount).map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === clamped}
                  onClick={() => go(p)}
                  className="cursor-pointer select-none"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => go(clamped + 1)}
              className={cn("cursor-pointer select-none", clamped === pageCount && "pointer-events-none opacity-40")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
