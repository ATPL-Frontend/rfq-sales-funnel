import { AsyncSearchSelect } from "@/components/AsyncSearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

type Customer = {
  id: number;
  name: string;
  email: string[];
  code: string;
  currency: "AUD" | "USD";
  gst: 0 | 1;
};

type RfqFilterValues = {
  customer_id: string;
  receive_date: string;
  start_date: string;
  end_date: string;
  progress: string;
  currency: string;
  content: string;
};

type Props = {
  filters: RfqFilterValues;
  setFilters: React.Dispatch<React.SetStateAction<RfqFilterValues>>;
  setAppliedFilters: React.Dispatch<React.SetStateAction<RfqFilterValues>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  closeModal: () => void;
};

export default function RfqFilter({
  filters,
  setFilters,
  setAppliedFilters,
  setPage,
  closeModal,
}: Props) {
  const emptyFilters: RfqFilterValues = {
    customer_id: "",
    receive_date: "",
    start_date: "",
    end_date: "",
    progress: "",
    currency: "",
    content: "",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">Customer</label>
        <AsyncSearchSelect<Customer>
          value={filters.customer_id}
          placeholder="Select customer"
          getKey={(c) => String(c.id)}
          displayValue={(c) => `${c.name} (Code - ${c.code})`}
          fetchOptions={async (query, page) => {
            const { data } = await api.get("/api/customers", {
              params: {
                page,
                limit: 20,
                q: query,
              },
            });

            return {
              data: data.data || [],
              hasMore: data.page < data.total_pages,
            };
          }}
          onChange={(c) =>
            setFilters((prev) => ({
              ...prev,
              customer_id: String(c.id),
            }))
          }
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Received Date
        </label>
        <Input
          type="date"
          value={filters.receive_date}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, receive_date: e.target.value }))
          }
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Start Date</label>
        <Input
          type="date"
          value={filters.start_date}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, start_date: e.target.value }))
          }
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">End Date</label>
        <Input
          type="date"
          value={filters.end_date}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, end_date: e.target.value }))
          }
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Currency</label>
        <Select
          value={filters.currency}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, currency: value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUD">AUD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm text-gray-600 mb-1">
          DCA / Content
        </label>
        <Input
          type="text"
          placeholder="e.g. DCA123"
          value={filters.content}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, content: e.target.value }))
          }
        />
      </div>

      <div className="md:col-span-2 flex gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setFilters(emptyFilters);
            setAppliedFilters(emptyFilters);
            setPage(1);
            closeModal();
          }}
        >
          Clear Filters
        </Button>

        <Button
          type="button"
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
}
