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
import { useCallback, useEffect, useState } from "react";

type FetchFunction<T> = (
  query: string,
  page: number,
) => Promise<{
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
  initialOption?: T | null;
};

export function AsyncSearchSelect<T>({
  value,
  onChange,
  placeholder = "Select option",
  displayValue,
  getKey,
  fetchOptions,
  initialOption = null,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialOption) return;

    setItems((prev) => {
      const exists = prev.some(
        (item) => getKey(item) === getKey(initialOption),
      );
      return exists ? prev : [initialOption, ...prev];
    });
  }, [initialOption, getKey]);

  const loadData = useCallback(
    async (pageToLoad: number, reset = false) => {
      if (loading) return;
      if (!reset && !hasMore) return;

      setLoading(true);
      try {
        const res = await fetchOptions(query, pageToLoad);

        setItems((prev) => {
          const base = reset ? (initialOption ? [initialOption] : []) : prev;

          const nextItems = [...base, ...res.data];

          return nextItems.filter(
            (item, index, arr) =>
              arr.findIndex((x) => getKey(x) === getKey(item)) === index,
          );
        });

        setHasMore(res.hasMore);
        setPage(pageToLoad + 1);
      } finally {
        setLoading(false);
      }
    },
    [fetchOptions, getKey, hasMore, initialOption, loading, query],
  );

  useEffect(() => {
    const delay = setTimeout(() => {
      setHasMore(true);
      loadData(1, true);
    }, 400);

    return () => clearTimeout(delay);
  }, [query]); // only query

  useEffect(() => {
    if (open && items.length === 0) {
      loadData(1, true);
    }
  }, [open]); // only open

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20 && !loading && hasMore) {
      loadData(page, false);
    }
  };

  const selectedItem =
    items.find((i) => getKey(i) === value) ||
    (initialOption && getKey(initialOption) === value
      ? initialOption
      : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between overflow-hidden",
            !value && "text-muted-foreground",
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
            value={query}
            onValueChange={setQuery}
          />

          <CommandList
            className="max-h-80 overflow-y-auto"
            onScroll={handleScroll}
          >
            <CommandEmpty>
              {loading ? "Loading..." : "No results found."}
            </CommandEmpty>

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
                      getKey(item) === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {displayValue(item)}
                </CommandItem>
              ))}

              {loading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}