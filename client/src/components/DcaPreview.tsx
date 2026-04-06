import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DcaPreviewProps = {
  contents?: string[] | null;
};

export function DcaPreview({ contents = [] }: DcaPreviewProps) {
  const items = Array.isArray(contents) ? contents.filter(Boolean) : [];
  const visibleItems = items.slice(0, 1);
  const remainingCount = items.length - visibleItems.length;

  if (items.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {visibleItems.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="inline-flex items-center rounded-md bg-secondary text-primary font-medium px-2 py-0.5 text-xs"
          >
            {item}
          </span>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex py-0.5 min-w-6 items-center justify-center rounded-md  px-2 text-xs bg-secondary text-primary font-medium"
              >
                +{remainingCount}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="flex flex-col gap-1">
                {items.map((item, index) => (
                  <span key={`${item}-tooltip-${index}`} className="text-xs">
                    {item}
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}