import { AsyncSearchSelect } from "@/components/AsyncSearchSelect";
import api from "@/lib/api";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "../ui/button";
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
    "Salesperson will cover rest",
    "Partially Submitted",
    "Sent to Salesperson (100%)",
    "Sent to Customer (Done)",
  ];

const PROGRESS_OPTIONS = ["0", "25", "50", "75", "100", "Done"];

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

  const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const loggedInUserId = storedUser?.id ? String(storedUser.id) : "";

  const initialContents =
    Array.isArray((rfq as any)?.contents) && (rfq as any).contents.length
      ? (rfq as any).contents.join(", ")
      : "";

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
    prepared_by: rfq?.prepared_by
      ? rfq.prepared_by.map((id) => String(id))
      : loggedInUserId
        ? [loggedInUserId]
        : [],
    progress: rfq?.progress || "0",
    rfq_location: rfq?.rfq_location || "",
    remarks: rfq?.remarks || "",
    contentsText: initialContents,
  });

  const isDone = form.progress === "Done";

  const normalizedContents = useMemo(
    () => [
      ...new Set(
        form.contentsText
          .split(",")
          .map((x: string) => x.trim().toUpperCase())
          .filter(Boolean),
      ),
    ],
    [form.contentsText],
  );

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
      contents: normalizedContents,
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

      <div>
        <label className="text-sm font-medium">Customer</label>
        <AsyncSearchSelect<Customer>
          value={form.customer_id}
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
            setForm((prev) => ({
              ...prev,
              customer_id: String(c.id),
              salesperson_id: c.salesperson_id
                ? String(c.salesperson_id)
                : prev.salesperson_id,
            }))
          }
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

      <div className="space-y-1">
        <label className="text-sm font-medium">Progress</label>
        <Select
          value={form.progress}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, progress: value }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select progress" />
          </SelectTrigger>
          <SelectContent>
            {PROGRESS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "Done" ? "Done" : `${option}%`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">DCA / Content Numbers</label>
        <Input
          type="text"
          placeholder="DCA123, DCA345, DCA900"
          value={form.contentsText}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, contentsText: e.target.value }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple DCA numbers with commas.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">RFQ Location</label>
        <Input
          type="text"
          value={form.rfq_location}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rfq_location: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Remarks</label>
        <Input
          type="text"
          value={form.remarks}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, remarks: e.target.value }))
          }
        />
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
