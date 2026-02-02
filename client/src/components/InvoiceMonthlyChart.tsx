import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlySummary = {
  month: string;
  year_month: string;
  num_invoices: number;
  total_aud: number;
  total_usd: number;
};

type Props = {
  data: MonthlySummary[];
  monthsToShow?: number;
};

export default function InvoiceMonthlyChart({
  data: chartdata,
  monthsToShow = 3,
}: Props) {
  // Sort data by month (most recent first)
  const sortedData = [...chartdata].sort((a, b) => {
    const monthNames = [
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
    const [aMonth, aYear] = a.month.split(" ");
    const [bMonth, bYear] = b.month.split(" ");
    if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear); // Oldest first
    return monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth);
  });

  // Take only the most recent months
  const recentMonthsData = sortedData.slice(0, monthsToShow);

  const formatCurrency = (value: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // Colors for the 3 months
  const monthColors = ["#ef4444", "#22c55e", "#3b82f6"]; // Red, Green, Blue

  return (
    <div className="grid grid-cols-1 print:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {/* 🧾 Chart 1: Number of Invoices per Month */}
      <Card className="w-full p-4 print:col-span-2 break-inside-avoid-page print:shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold">
            Invoices per Month
          </CardTitle>
          <p className="text-sm text-gray-500">
            Number of invoices
          </p>
        </CardHeader>
        <CardContent className="m-0 p-0 print:w-full">
          <div className="w-full h-[250px] print:w-full print:max-w-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={recentMonthsData}
                margin={{ top: 20, right: 30, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value, "Invoices"]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar
                  dataKey="num_invoices"
                  radius={[4, 4, 0, 0]}
                  name="Invoices"
                >
                  {recentMonthsData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={monthColors[index % monthColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="num_invoices"
                    position="top"
                    fontSize={11}
                    fill="#666"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 💰 Chart 2: AUD Amount per Month */}
      <Card className="w-full p-4 break-inside-avoid-page print:shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold">
            AUD Amount per Month
          </CardTitle>
          <p className="text-sm text-gray-500">
            Total AUD
          </p>
        </CardHeader>
        <CardContent className="m-0 p-0">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={recentMonthsData}
                margin={{ top: 20, right: 30, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value), "AUD"),
                    "AUD",
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar
                  dataKey="total_aud"
                  radius={[4, 4, 0, 0]}
                  name="AUD Amount"
                >
                  {recentMonthsData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={monthColors[index % monthColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="total_aud"
                    position="top"
                    fontSize={11}
                    fill="#666"
                    formatter={(v: number) =>
                      formatCurrency(v, "AUD")
                        .replace("A$", "")
                        .replace("$", "")
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 💵 Chart 3: USD Amount per Month */}
      <Card className="w-full p-4 break-inside-avoid-page print:shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold">
            USD Amount per Month
          </CardTitle>
          <p className="text-sm text-gray-500">
            Total USD
          </p>
        </CardHeader>
        <CardContent className="m-0 p-0">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={recentMonthsData}
                margin={{ top: 20, right: 30, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value), "USD"),
                    "USD",
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Bar
                  dataKey="total_usd"
                  radius={[4, 4, 0, 0]}
                  name="USD Amount"
                >
                  {recentMonthsData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={monthColors[index % monthColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="total_usd"
                    position="top"
                    fontSize={11}
                    fill="#666"
                    formatter={(v: number) =>
                      formatCurrency(v, "USD")
                        .replace("US$", "")
                        .replace("$", "")
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
