import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

type SummaryFilters = {
  date_type: "invoice_date" | "create_invoice_date";
  date_from: string;
  date_to: string;
  salesperson_id: string;
};

type Props = {
  filters: SummaryFilters;
  setFilters: React.Dispatch<React.SetStateAction<SummaryFilters>>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<SummaryFilters>>;
  salespersons: { id: number; name: string }[];
  defaultFrom: string;
  defaultTo: string;
  closeModal: () => void;
};

export default function InvoiceSummaryFilter({
  filters,
  setFilters,
  setAppliedFilters,
  salespersons,
  defaultFrom,
  defaultTo,
  closeModal,
}: Props) {
  const [dateTypeOpen, setDateTypeOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);

  const dateTypeLabel = useMemo(() => {
    return filters.date_type === "invoice_date" ? "Sent Date" : "Created Date";
  }, [filters.date_type]);

  const selectedSalesPerson = useMemo(() => {
    if (!filters.salesperson_id) return "";
    const found = salespersons.find(
      (s) => String(s.id) === String(filters.salesperson_id),
    );
    return found?.name || "";
  }, [filters.salesperson_id, salespersons]);

  return (
    <div className="flex flex-col gap-3">
      {/* DATE TYPE */}
      <div>
        <Label className="text-sm font-medium mb-2">Date Type</Label>

        <RadioGroup
          value={filters.date_type}
          onValueChange={(value: "invoice_date" | "create_invoice_date") =>
            setFilters((prev) => ({
              ...prev,
              date_type: value,
              date_from: "",
              date_to: "",
            }))
          }
          className="flex gap-6 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="invoice_date" id="invoice_date" />
            <Label htmlFor="invoice_date">Invoice Sent Date</Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="create_invoice_date"
              id="create_invoice_date"
            />
            <Label htmlFor="create_invoice_date">Invoice Created Date</Label>
          </div>
        </RadioGroup>
      </div>

      {/* FROM */}
      <div>
        <Label className="text-sm font-medium mb-2">From Date</Label>
        <Input
          type="date"
          value={filters.date_from}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, date_from: e.target.value }))
          }
        />
      </div>

      {/* TO */}
      <div>
        <Label className="text-sm font-medium mb-2">To Date</Label>
        <Input
          type="date"
          value={filters.date_to}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, date_to: e.target.value }))
          }
        />
      </div>

      {/* SALES PERSON */}
      <div>
        <Label className="text-sm font-medium mb-2">Sales Person</Label>

        <PopoverPrimitive.Root open={salesOpen} onOpenChange={setSalesOpen}>
          <PopoverPrimitive.Trigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-between w-full",
                !filters.salesperson_id && "text-muted-foreground",
              )}
            >
              {selectedSalesPerson || "Select salesperson"}
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            </Button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Content
            className="p-0 w-[--radix-popover-trigger-width] border z-10 border-gray-300 rounded-lg bg-white"
            align="start"
          >
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    value="All"
                    onSelect={() => {
                      setFilters((prev) => ({ ...prev, salesperson_id: "" }));
                      setSalesOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        !filters.salesperson_id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    All
                  </CommandItem>

                  {salespersons.map((sp) => (
                    <CommandItem
                      key={sp.id}
                      value={sp.name}
                      onSelect={() => {
                        setFilters((prev) => ({
                          ...prev,
                          salesperson_id: String(sp.id),
                        }));
                        setSalesOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          String(filters.salesperson_id) === String(sp.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {sp.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Root>
      </div>

      {/* APPLY + CLEAR */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            const cleared: SummaryFilters = {
              date_type: "invoice_date",
              date_from: defaultFrom,
              date_to: defaultTo,
              salesperson_id: "",
            };
            setFilters(cleared);
            setAppliedFilters(cleared);
            closeModal();
          }}
        >
          Clear Filters
        </Button>

        <Button
          className="flex-1"
          onClick={() => {
            setAppliedFilters(filters);
            closeModal();
          }}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
