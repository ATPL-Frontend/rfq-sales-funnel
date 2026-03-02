import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
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

type FetchFunction<T> = (query: string, page: number) => Promise<{
  data: T[];
  hasMore: boolean;
}>;

type Props<T> = {
  value: string | null;
  onChange: (item: T) => void;
  placeholder?: string;
  displayValue: (item: T) => string;
  getKey: (item: T) => string;
  fetchOptions: FetchFunction<T>;
};

export function AsyncSearchSelect<T>({
  value,
  onChange,
  placeholder = "Select option",
  displayValue,
  getKey,
  fetchOptions,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      setLoading(true);
      try {
        const currentPage = reset ? 1 : page;

        const res = await fetchOptions(query, currentPage);

        setItems((prev) =>
          reset ? res.data : [...prev, ...res.data]
        );

        setHasMore(res.hasMore);
        setPage((prev) => (reset ? 2 : prev + 1));
      } finally {
        setLoading(false);
      }
    },
    [query, page, hasMore, loading, fetchOptions]
  );

  // 🔥 Debounce search
  useEffect(() => {
  const delay = setTimeout(() => {
    setPage(1);
    setHasMore(true);
    setItems([]);
    loadData(true);
  }, 400);

  return () => clearTimeout(delay);
}, [query]);

  // Load when opened first time
  useEffect(() => {
    if (open && items.length === 0) {
      loadData(true);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      loadData();
    }
  };

  const selectedItem = items.find((i) => getKey(i) === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between overflow-hidden",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate max-w-[90%]">
            {selectedItem ? displayValue(selectedItem) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            onValueChange={(val) => setQuery(val)}
          />

          <CommandList
            className="max-h-80 overflow-y-auto"
            onScroll={handleScroll}
          >
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={getKey(item)}
                  value={getKey(item)}
                  onSelect={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      getKey(item) === value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {displayValue(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}