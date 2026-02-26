import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SlidersHorizontal } from "lucide-react";
import * as React from "react";

type FilterModalProps = {
  disabled?: boolean;
  type?: "button" | "icon";
  label?: string;
  title?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
};

export function FilterModal({
  disabled = false,
  type = "button",
  label = "Filters",
  title = "Filters",
  children,
}: FilterModalProps) {
  const [open, setOpen] = React.useState(false);

  const closeModal = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          variant={type === "button" ? "default" : "ghost"}
          size={type === "button" ? "default" : "sm"}
          className={
            type === "button"
              ? ""
              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
          }
        >
          {type === "button" ? (
            <>
              <SlidersHorizontal className="size-4" />
              <span className="sm:block hidden">{label}</span>
            </>
          ) : (
            <SlidersHorizontal className="w-4 h-4" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-5/6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {typeof children === "function" ? children(closeModal) : children}
      </DialogContent>
    </Dialog>
  );
}
