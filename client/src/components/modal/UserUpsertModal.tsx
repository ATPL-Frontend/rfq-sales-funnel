import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import UserForm from "@/pages/auth/RegisterPage"; // adjust import
import type { UserList } from "@/types";
import { Edit, UserPlus } from "lucide-react";
import * as React from "react";

type Props = {
  user: UserList | null; // null = create, user = edit
  roles: string[];
  onSuccess: (user: UserList, isEdit: boolean) => void;

  type?: "button" | "icon";
  triggerLabel?: string;
  title?: string;

  // optional: disable trigger externally (e.g. page loading)
  disabled?: boolean;
};

export function UserUpsertModal({
  user,
  roles,
  onSuccess,
  type = "icon",
  triggerLabel,
  title,
  disabled = false,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const isEdit = Boolean(user?.id);

  const modalTitle = title ?? (isEdit ? "Edit User" : "Create User");
  const label = triggerLabel ?? (isEdit ? "Edit" : "Add User");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {type === "button" ? (
          <Button disabled={disabled} variant="default" size="sm">
            {isEdit ? (
                <Edit className="size-4" />
              ) : (
                <UserPlus className="size-4" />
              )}
              <span className="sm:block hidden">{label}</span>
          </Button>
        ) : (
          <Edit className="size-4 text-emerald-400 hover:text-emerald-600 cursor-pointer" />
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>

        {/* key is IMPORTANT so form resets when switching rows */}
        <UserForm
          key={user?.id ?? "create"}
          user={user}
          roles={roles}
          onSuccess={(savedUser, wasEdit) => {
            onSuccess(savedUser, wasEdit);
            setOpen(false); // ✅ close only on success
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
