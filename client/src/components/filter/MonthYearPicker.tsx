import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  value?: string; // format: YYYY-MM
  onChange: (val: string) => void;
  placeholder?: string;
}

const MonthYearPicker = ({ value, onChange, placeholder }: Props) => {
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, [currentYear]);

  const initialYear = value ? Number(value.split("-")[0]) : currentYear;
  const initialMonth = value ? value.split("-")[1] : "";

  const [year, setYear] = useState(initialYear);
  const [open, setOpen] = useState(false);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    onChange(`${year}-${month}`);
    setOpen(false);
  };

  const formattedLabel = value
    ? new Date(
        Number(value.split("-")[0]),
        Number(value.split("-")[1]) - 1,
        1,
      ).toLocaleString("default", { month: "short", year: "numeric" })
    : placeholder || "Select Month";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="sm:w-40 w-28 h-8 justify-between">
          {formattedLabel} <ChevronDownIcon />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2 space-y-2">
        {/* Year Select */}
        <div className="flex px-1 gap-4 items-center border-b pb-2">
          <span className="text-primary font-semibold">Year</span>
          <Select
            value={String(year)}
            onValueChange={(val) => setYear(Number(val))}
          >
            <SelectTrigger className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-4 gap-2">
          {months.map((m, idx) => (
            <Button
              size="sm"
              key={m}
              variant="ghost"
              className={cn(
                "text-sm",
                initialMonth === String(idx + 1).padStart(2, "0") &&
                  year === initialYear &&
                  "bg-primary text-primary-foreground",
              )}
              onClick={() => handleMonthSelect(idx)}
            >
              {m}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MonthYearPicker;
