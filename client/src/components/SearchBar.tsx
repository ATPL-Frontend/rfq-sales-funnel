import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as React from "react";

type SearchBarProps = {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
};

const SearchBar = ({
  searchTerm = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
}: SearchBarProps) => {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
        {onSearchChange && (
          <div className="relative w-full max-w-xs">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default SearchBar;