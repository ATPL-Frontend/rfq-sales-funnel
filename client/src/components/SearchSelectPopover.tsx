import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

type Option = {
  id: number | string;
  name: string;
  short_form?: string;
  code?: string;
};

type UserSelectPopoverProps = {
  label: string;
  options: Option[];
  value: string | string[] | number | null;
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  searchable?: boolean;
};

export default function UserSelectPopover({
  label,
  options,
  value,
  onChange,
  placeholder = "Select option",
  searchable = true,
}: UserSelectPopoverProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (id: string) => {
    if (Array.isArray(value)) {
      const exists = value.includes(id);
      onChange(exists ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange(id);
      setOpen(false);
    }
  };

  const getSelectedLabel = () => {
    if (Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      return options
        .filter((opt) => value.includes(String(opt.id)))
        .map((opt) => opt.short_form || opt.name)
        .join(", ");
    }
    if (!value) return placeholder;
    return (
      options.find((opt) => String(opt.id) === String(value))?.name ||
      placeholder
    );
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>

      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between overflow-hidden",
              (!value || (Array.isArray(value) && value.length === 0)) &&
                "text-muted-foreground"
            )}
          >
            <span className="truncate max-w-[90%]">{getSelectedLabel()}</span>
            <ChevronsUpDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command className="max-h-64 overflow-y-auto">
            {searchable !== false && (
              <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            )}
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()}s found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const selected = Array.isArray(value)
                    ? value.includes(String(opt.id))
                    : String(opt.id) === String(value);
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.name}
                      onSelect={() => toggleValue(String(opt.id))}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {opt.name}{" "}
                      {opt.short_form && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({opt.short_form})
                        </span>
                      )}
                      {opt.code && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (Code - {opt.code})
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
