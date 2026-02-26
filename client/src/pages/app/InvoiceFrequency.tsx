import type { Column } from "@/components/CommonTable";
import CommonTable from "@/components/CommonTable";
import MonthYearPicker from "@/components/filter/MonthYearPicker";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";

interface MonthlyData {
  year_month: string;
  month: string;
  invoice_count: number;
}

interface CustomerApiData {
  customer_id: number;
  customer_name: string;
  monthly_data: MonthlyData[];
}

interface FrequencyRow {
  customer_id: number;
  customer_name: string;
  [key: string]: any;
}

const InvoiceFrequency = () => {
  const [rawData, setRawData] = useState<CustomerApiData[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const [fromMonth, setFromMonth] = useState(`${currentYear}-01`);
  const [toMonth, setToMonth] = useState(`${currentYear}-12`);

  const fetchData = async () => {
    if (!fromMonth || !toMonth) {
      toast.error("Please select both From and To month");
      return;
    }

    if (fromMonth > toMonth) {
      toast.error("From month cannot be greater than To month");
      return;
    }

    try {
      setLoading(true);

      const from = `${fromMonth}-01`;

      const toDate = new Date(
        Number(toMonth.split("-")[0]),
        Number(toMonth.split("-")[1]),
        0,
      )
        .toISOString()
        .split("T")[0];

      const res = await api.get(
        `/api/invoices/frequency?from=${from}&to=${toDate}`,
      );

      setRawData(res.data.data || []);
    } catch (err) {
      console.error("Frequency fetch error:", err);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Extract unique months
  const months = useMemo(() => {
    const map = new Map<string, string>();

    rawData.forEach((c) => {
      c.monthly_data.forEach((m) => {
        map.set(m.year_month, m.month);
      });
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));
  }, [rawData]);

  const tableData: FrequencyRow[] = useMemo(() => {
    return rawData.map((customer) => {
      const row: FrequencyRow = {
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
      };

      months.forEach((m) => {
        const found = customer.monthly_data.find((x) => x.year_month === m.key);

        row[m.key] = found ? found.invoice_count : 0;
      });

      return row;
    });
  }, [rawData, months]);

  const columns: Column<FrequencyRow>[] = useMemo(() => {
    const baseColumn: Column<FrequencyRow> = {
      key: "customer_name",
      label: "Customer",
      render: (row) => (
        <span className="font-medium text-primary">{row.customer_name}</span>
      ),
    };

    const monthColumns: Column<FrequencyRow>[] = months.map((m) => ({
      key: m.key,
      label: <div className="text-center">{m.label}</div>,
      render: (row) => (
        <div className="text-center font-medium">{row[m.key] ?? 0}</div>
      ),
    }));

    return [baseColumn, ...monthColumns];
  }, [months]);

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h1 className="text-xl font-semibold">Invoice Frequency</h1>

        <div className="flex items-center sm:gap-3 gap-2 flex-wrap">
          <MonthYearPicker
            value={fromMonth}
            onChange={setFromMonth}
            placeholder="From Month"
          />

          <span className="text-muted-foreground">to</span>

          <MonthYearPicker
            value={toMonth}
            onChange={setToMonth}
            placeholder="To Month"
          />

          <Button size="sm" onClick={fetchData}>Apply</Button>
        </div>
      </div>

      <CommonTable columns={columns} data={tableData} loading={loading} />
    </div>
  );
};

export default InvoiceFrequency;
