import { Check, Copy } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type LocationCellProps = {
  value?: string | null;
};

export function LocationCell({ value }: LocationCellProps) {
  const [copied, setCopied] = useState(false);

  const text = value?.trim() || "-";

  const handleCopy = async () => {
    if (!value?.trim()) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Location copied");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Failed to copy location");
    }
  };

  return (
    <div className="flex justify-between min-w-25 max-w-30 items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate text-sm text-slate-700 cursor-default">
              {text}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs wrap-break-word">
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {value?.trim() && (
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          {copied ? (
            <Check className="size-4 text-primary" />
          ) : (
            <Copy className="size-4 text-primary" />
          )}
        </button>
      )}
    </div>
  );
}
