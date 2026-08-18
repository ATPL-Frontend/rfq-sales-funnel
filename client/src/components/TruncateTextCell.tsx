import { Check, Copy } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type TruncateTextCellProps = {
  value?: string | null;
  toolTipText?: string;
  fallback?: string;
  className?: string;
  textClassName?: string;
  tooltipClassName?: string;
  copyable?: boolean;
  copyValue?: string;
  copySuccessMessage?: string;
};

export function TruncateTextCell({
  value,
  toolTipText,
  fallback = "-",
  className = "",
  textClassName = "",
  tooltipClassName = "",
  copyable = false,
  copyValue,
  copySuccessMessage = "Copied",
}: TruncateTextCellProps) {
  const [copied, setCopied] = useState(false);

  const text = value?.trim() || fallback;
  const finalCopyValue = copyValue ?? value ?? "";
  const showCopy = copyable && !!finalCopyValue.trim();

  const handleCopy = async () => {
    if (!finalCopyValue.trim()) return;
    console.log("Copying value:", finalCopyValue.split("\\").slice(3).join("\\"));

    try {
      await navigator.clipboard.writeText(finalCopyValue.split("\\").slice(3).join("\\"));
      setCopied(true);
      toast.success(copySuccessMessage);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`truncate text-xs text-slate-700 dark:text-slate-300 cursor-default ${showCopy ? "flex-1" : "w-full"} ${textClassName}`}
            >
              {text}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className={`max-w-xs wrap-break-word ${tooltipClassName}`}
          >
            <p>{toolTipText || text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 transition-colors"
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
