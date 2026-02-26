import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

type DeleteModalProps = {
  onDeleteItem?: (id: string | number) => void | Promise<void>;
  actionLoading?: boolean;
  id?: string | number;
  name?: string;
  type?: "button" | "icon";
  triggerLabel?: string;
};

export function DeleteModal({
  onDeleteItem = () => {},
  actionLoading = false,
  id = "",
  name = "",
  type = "button",
  triggerLabel = "Delete",
}: DeleteModalProps) {
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      // wait for parent thunk
      onDeleteItem(id);
      setOpen(false); // close only on success
    } catch (err) {
      // modal stays open if error occurs
      console.error("Delete failed:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {type === "button" ? (
          <Button variant="destructive" size="sm">
            <Trash2 className="size-4" />
            <span>{triggerLabel}</span>
          </Button>
        ) : (
          <Trash2 className="size-4 text-red-400 hover:text-red-600 cursor-pointer" />
        )}
        {/* <Button
          variant={type === "button" ? "destructive" : "ghost"}
          className={
            type === "button"
              ? ""
              : "text-red-500 hover:text-red-600 hover:bg-red-100"
          }
          type="button"
          size={type === "button" ? "default" : "sm"}
        >
          {type === "button" ? (
            <>
              <Trash2 className="size-4" />
              <span>{triggerLabel}</span>
            </>
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button> */}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p>
            Are you sure you want to delete <strong>{name}</strong>?
          </p>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={actionLoading} // prevent closing while deleting
            >
              No, Keep it
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 animate-spin inline-block" />
              )}
              Yes, Delete!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
