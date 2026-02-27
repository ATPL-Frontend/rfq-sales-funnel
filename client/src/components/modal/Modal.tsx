import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BadgeAlert,
  Edit,
  Plus,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import * as React from "react";

type ModalProps = {
  disabled?: boolean;
  type?: "button" | "icon";
  label?: string;
  title?: string;
  icon?: "filter" | "add" | "edit" | "userplus" | React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
};

export function Modal({
  disabled = false,
  type = "button",
  label = "Open",
  title = "Modal",
  icon = "filter",
  size = "sm",
  children,
}: ModalProps) {
  const [open, setOpen] = React.useState(false);

  const closeModal = () => setOpen(false);

  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;

    switch (icon) {
      case "add":
        return <Plus className="size-4" />;
      case "edit":
        return <Edit className="size-4" />;
      case "filter":
        return <SlidersHorizontal className="size-4" />;
      case "userplus":
        return <UserPlus className="size-4" />;
      default:
        return <BadgeAlert className="size-4" />;
    }
  };

  // ✅ Dialog width control
  const sizeClass =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {type === "button" ? (
          <Button type="button" disabled={disabled} variant="default" size="sm">
            {renderIcon()}
            <span className="sm:block hidden">{label}</span>
          </Button>
        ) : (
          <div className="cursor-pointer text-emerald-600 hover:text-emerald-700">
            {renderIcon()}
          </div>
        )}
      </DialogTrigger>

      <DialogContent className={`${sizeClass} w-5/6 max-h-[90vh] p-0`}>
        <div className="max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {typeof children === "function" ? children(closeModal) : children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
