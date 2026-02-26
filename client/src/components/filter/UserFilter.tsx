import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Label } from "../ui/label";

type StatusItem = {
  label: string;
  value: string;
};

type Props = {
  filters: {
    q: string;
    role: string;
    user_type: string;
    is_active: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<any>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  roleList: string[];
  types: string[];
  statusList: StatusItem[];
  closeModal: () => void;
};

const UserFilter = ({
  filters,
  setFilters,
  setAppliedFilters,
  setPage,
  roleList,
  types,
  statusList,
  closeModal,
}: Props) => {
  const [roleOpen, setRoleOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* ROLE FILTER */}
      <div>
        <Label className="text-sm font-medium mb-2">Role</Label>
        <Popover open={roleOpen} onOpenChange={setRoleOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`justify-between w-full ${filters?.role ? "" : "text-muted-foreground"}`}
            >
              {filters.role || "Select Role"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="p-0 min-w-(--radix-popover-trigger-width) w-auto border z-10 border-gray-300 rounded-lg">
            <Command>
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup>
                  {roleList.map((r) => (
                    <CommandItem
                      key={r}
                      value={r}
                      onSelect={() => {
                        setFilters((prev: any) => ({
                          ...prev,
                          role: prev.role === r ? "" : r,
                        }));
                        setRoleOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          filters.role === r ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {r}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* USER TYPE */}
      <div>
        <Label className="text-sm font-medium mb-2">User Type</Label>
        <Popover open={typeOpen} onOpenChange={setTypeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`justify-between w-full ${filters?.user_type ? "" : "text-muted-foreground"}`}
            >
              {filters.user_type || "User Type"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="p-0 min-w-(--radix-popover-trigger-width) w-auto border border-gray-300 z-10 rounded-lg">
            <Command>
              <CommandList>
                <CommandGroup>
                  {types.map((t) => (
                    <CommandItem
                      key={t}
                      value={t}
                      onSelect={() => {
                        setFilters((prev: any) => ({
                          ...prev,
                          user_type: prev.user_type === t ? "" : t,
                        }));
                        setTypeOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          filters.user_type === t ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {t}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* STATUS */}
      <div>
        <Label className="text-sm font-medium mb-2">Status</Label>
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between w-full">
              {statusList.find((s) => s.value === filters.is_active)?.label ||
                "Status"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="p-0 min-w-(--radix-popover-trigger-width) w-auto border border-gray-300 z-10 rounded-lg">
            <Command>
              <CommandList>
                <CommandGroup>
                  {statusList.map((s) => (
                    <CommandItem
                      key={s.value}
                      value={s.label}
                      onSelect={() => {
                        setFilters((prev: any) => ({
                          ...prev,
                          is_active: s.value,
                        }));
                        setStatusOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          filters.is_active === s.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {s.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* APPLY + CLEAR */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            const cleared = {
              q: "",
              role: "",
              user_type: "",
              is_active: "true",
            };
            setFilters(cleared);
            setAppliedFilters(cleared);
            setPage(1);
          }}
        >
          Clear Filters
        </Button>

        <Button
          className="flex-1"
          onClick={() => {
            setAppliedFilters(filters);
            setPage(1);
            closeModal();
          }}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default UserFilter;
