import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  filters: any;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<any>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  closeModal: () => void;
};

export default function InvoiceFilter({
  filters,
  setFilters,
  setAppliedFilters,
  setPage,
  closeModal,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Currency */}
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select
          value={filters.currency}
          onValueChange={(value) =>
            setFilters((prev: any) => ({
              ...prev,
              currency: value,
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select currency" className="w-full" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUD">AUD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Type */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Date Type</Label>

        <RadioGroup
          value={filters.date_filter_type}
          onValueChange={(value: "invoice_date" | "create_invoice_date") =>
            setFilters((prev: any) => ({
              ...prev,
              date_filter_type: value,
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

      {/* Date From */}
      <div className="space-y-2">
        <Label>Date From</Label>
        <Input
          type="date"
          value={filters.date_from}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              date_from: e.target.value,
            }))
          }
        />
      </div>

      {/* Date To */}
      <div className="space-y-2">
        <Label>Date To</Label>
        <Input
          type="date"
          value={filters.date_to}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              date_to: e.target.value,
            }))
          }
        />
      </div>

      {/* Amount From */}
      <div className="space-y-2">
        <Label>Amount From</Label>
        <Input
          type="number"
          value={filters.amount_from}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              amount_from: e.target.value,
            }))
          }
          placeholder="10000"
        />
      </div>

      {/* Amount To */}
      <div className="space-y-2">
        <Label>Amount To</Label>
        <Input
          type="number"
          value={filters.amount_to}
          onChange={(e) =>
            setFilters((prev: any) => ({
              ...prev,
              amount_to: e.target.value,
            }))
          }
          placeholder="50000"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            const empty = {
              date_filter_type: "invoice_date",
              date_from: "",
              date_to: "",
              amount_from: "",
              amount_to: "",
              currency: "",
            };
            setFilters(empty);
            setAppliedFilters(empty);
            setPage(1);
          }}
        >
          Clear
        </Button>

        <Button
          className="flex-1"
          onClick={() => {
            setAppliedFilters(filters);
            setPage(1);
            closeModal();
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
