import { AsyncSearchSelect } from "@/components/AsyncSearchSelect";
import TagsInput from "@/components/TagsInput";
import api from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import type { Rfq, SalesPerson } from "@/types/index.ts";
import SearchSelectPopover from "../SearchSelectPopover";
import { DialogFooter } from "../ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";

type Customer = {
  id: number;
  name: string;
  email: string[];
  code: string;
  currency: "AUD" | "USD";
  gst: 0 | 1;
  salesperson_id?: string | number;
};

type Props = {
  rfq: Rfq | null;
  salesPerson: SalesPerson[] | null;
  userList: SalesPerson[] | null;
  onSuccess: (rfq: any, isEdit: boolean) => void;
  onCancel: () => void;
};

const remarkOptions = [
  "Waiting for Drawing",
  "Waiting for Customer's BOM",
  "Waiting for vendor quotation",
  "Waiting for Salesperson",
  "Waiting for Drawing Revision",
  "Working on Progress",
  "Salesperson will cover rest",
  "Partially Submitted",
  "Sent to Salesperson (100%)",
  "Sent to Customer (Done)",
];

const WORK_TYPE_OPTIONS = [
  "Buy & Sale",
  "Cable Assembly",
  "Box Build",
  "Engineering Work",
];

export default function RfqForm({
  rfq,
  salesPerson,
  userList,
  onSuccess,
  onCancel,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const loggedInUserId = storedUser?.id ? String(storedUser.id) : "";

  const [form, setForm] = useState({
    receive_date: rfq?.receive_date || "",
    start_date: rfq?.start_date || "",
    end_date: rfq?.end_date || "",
    customer_id: rfq?.customer_id ? String(rfq.customer_id) : "",
    salesperson_id: rfq?.salesperson_id ? String(rfq.salesperson_id) : "",
    quantity: rfq?.quantity ?? "",
    price: rfq?.price ?? "",
    currency: rfq?.currency || "AUD",
    work_type: rfq?.work_type || "Buy & Sale",
    prepared_by: Array.isArray(rfq?.prepared_by)
      ? rfq.prepared_by.map((item: any) =>
          typeof item === "object" ? String(item.id) : String(item),
        )
      : loggedInUserId
        ? [loggedInUserId]
        : [],
    progress:
      rfq?.progress === "Done"
        ? "Done"
        : rfq?.progress
          ? String(rfq.progress)
          : "",
    rfq_location: rfq?.rfq_location || "",
    remarks: rfq?.remarks || "",
    contents: Array.isArray((rfq as any)?.contents)
      ? (rfq as any).contents
      : [],
  });

  const [remarksFocused, setRemarksFocused] = useState(false);
  const [remarksWidth, setRemarksWidth] = useState(0);
  const remarksAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!remarksAnchorRef.current) return;

    const updateWidth = () => {
      setRemarksWidth(remarksAnchorRef.current?.offsetWidth || 0);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(remarksAnchorRef.current);

    window.addEventListener("resize", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const isDone = form.progress === "Done";

  useEffect(() => {
    const loadSelectedCustomer = async () => {
      if (!rfq?.customer_id) return;

      try {
        const { data } = await api.get(`/api/customers/${rfq.customer_id}`);
        setSelectedCustomer(data.data || data);
      } catch {
        // ignore
      }
    };

    loadSelectedCustomer();
  }, [rfq?.customer_id]);

  const filteredRemarkOptions = useMemo(() => {
    const text = form.remarks.trim().toLowerCase();

    if (!text) return remarkOptions;

    return remarkOptions.filter((option) =>
      option.toLowerCase().includes(text),
    );
  }, [form.remarks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDone) {
      if (form.price === "" || form.price == null) {
        toast.error('Price is required when progress is "Done"');
        return;
      }

      if (!form.end_date) {
        toast.error('End date is required when progress is "Done"');
        return;
      }
    }

    const payload = {
      receive_date: form.receive_date,
      start_date: form.start_date,
      end_date: form.end_date || null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      salesperson_id: form.salesperson_id ? Number(form.salesperson_id) : null,
      quantity: form.quantity === "" ? null : Number(form.quantity),
      price: form.price === "" ? null : String(form.price),
      currency: form.currency,
      work_type: form.work_type,
      prepared_by: form.prepared_by.map((id) => Number(id)),
      progress: form.progress,
      rfq_location: form.rfq_location || null,
      remarks: form.remarks || null,
      contents: form.contents,
    };

    setSaving(true);

    try {
      let response;

      if (rfq) {
        response = await api.put(`/api/rfqs/${rfq.id}`, payload);
        toast.success("RFQ updated successfully");
        onSuccess(response.data.data || response.data, true);
      } else {
        response = await api.post("/api/rfqs", payload);
        toast.success("RFQ created successfully");
        onSuccess(response.data.data || response.data, false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save RFQ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1 flex gap-2">
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Receive Date</label>
          <Input
            type="date"
            value={form.receive_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, receive_date: e.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, start_date: e.target.value }))
            }
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Customer</label>
        <AsyncSearchSelect<Customer>
          value={form.customer_id}
          initialOption={selectedCustomer}
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
          onChange={(c) => {
            setSelectedCustomer(c);
            setForm((prev) => ({
              ...prev,
              customer_id: String(c.id),
              salesperson_id: c.salesperson_id
                ? String(c.salesperson_id)
                : prev.salesperson_id,
            }));
          }}
        />
      </div>

      <SearchSelectPopover
        label="Salesperson"
        options={(salesPerson || []).map((sp) => ({
          id: String(sp.id),
          name: sp.name,
          short_form: sp.short_form,
        }))}
        value={form.salesperson_id}
        onChange={(val) =>
          setForm((prev) => ({ ...prev, salesperson_id: String(val) }))
        }
        placeholder="Select salesperson"
      />

      <div className="space-y-1 flex gap-2">
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Quantity</label>
          <Input
            type="number"
            value={form.quantity}
            placeholder="Ex: 100"
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                quantity: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </div>

        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">
            End Date {isDone ? "*" : ""}
          </label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, end_date: e.target.value }))
            }
            required={isDone}
          />
        </div>
      </div>

      <div className="space-y-1 flex gap-2">
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">
            Price {isDone ? "*" : ""}
          </label>
          <Input
            type="number"
            value={form.price}
            placeholder="$100.00"
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                price: e.target.value === "" ? "" : e.target.value,
              }))
            }
            required={isDone}
          />
        </div>

        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Currency</label>
          <Select
            value={form.currency}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, currency: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Work Type</label>
        <Select
          value={form.work_type}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, work_type: value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select work type" />
          </SelectTrigger>
          <SelectContent>
            {WORK_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SearchSelectPopover
        label="Prepared By"
        options={userList || []}
        value={form.prepared_by}
        onChange={(val) =>
          setForm((prev) => ({
            ...prev,
            prepared_by: Array.isArray(val) ? (val as string[]) : [String(val)],
          }))
        }
        multiple={true}
        placeholder="Select prepared by"
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Progress</label>

        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="0 - 100"
            value={isDone ? "" : form.progress}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                progress:
                  e.target.value === "" ? "" : String(Number(e.target.value)),
              }))
            }
            disabled={isDone}
          />

          <div className="flex items-center gap-2 whitespace-nowrap">
            <Checkbox
              id="progress_done"
              checked={isDone}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  progress: checked ? "Done" : "",
                }))
              }
            />
            <label htmlFor="progress_done" className="text-sm font-medium">
              Done
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">DCA Numbers</label>
        <TagsInput
          value={form.contents}
          onChange={(contents) =>
            setForm((prev) => ({
              ...prev,
              contents: contents.map((x) => x.trim().toUpperCase()),
            }))
          }
          placeholder="Paste or type DCA123, DCA345"
          normalize={(v) => v.trim().toUpperCase()}
        />
        <p className="text-xs text-primary">
          Paste values separated by comma, space, or new line.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">RFQ Location</label>
        <Input
          type="text"
          value={form.rfq_location}
          placeholder="Enter RFQ Location"
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rfq_location: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Remarks</label>

        <Popover open={remarksFocused} modal>
          <PopoverAnchor asChild>
            <div ref={remarksAnchorRef}>
              <Input
                type="text"
                value={form.remarks}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                onFocus={() => setRemarksFocused(true)}
                onBlur={() => {
                  setTimeout(() => setRemarksFocused(false), 150);
                }}
                placeholder="Write remark or select suggestion"
              />
            </div>
          </PopoverAnchor>

          {filteredRemarkOptions.length > 0 && (
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={6}
              style={{ width: remarksWidth || undefined }}
              className="p-1 max-h-48 overflow-y-auto"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-1">
                {filteredRemarkOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        remarks: option,
                      }));
                      setRemarksFocused(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : rfq ? "Save Changes" : "Create RFQ"}
        </Button>
      </DialogFooter>
    </form>
  );
}
