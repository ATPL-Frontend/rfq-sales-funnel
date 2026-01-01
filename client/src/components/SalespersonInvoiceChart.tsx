import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { TooltipProps } from 'recharts';

type SalespersonChartProps = {
  data: any[];
  monthsToShow?: number;
};

// Define types for the tooltip formatter
type TooltipFormatter = TooltipProps<number, string>['formatter'];

export default function SalespersonChart({ 
  data, 
  monthsToShow = 3 
}: SalespersonChartProps) {
  const formatCurrency = (value: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // Extract unique months and sort them (most recent first)
  const allMonths = Array.from(
    new Set(
      data.flatMap((sp) => sp.monthly_data?.map((m: any) => m.month) || [])
    )
  ).sort((a, b) => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");
    if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
    return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
  });

  // Take only the specified number of recent months
  const recentMonths = allMonths.slice(0, monthsToShow);
  
  // Get unique salesperson names
  const salespersons = data.map(sp => ({
    id: sp.salesperson_id,
    name: sp.salesperson_name,
    shortName: sp.salesperson_short_form || 
               sp.salesperson_name?.split(" ")[0] || 
               `SP${sp.salesperson_id}`
  }));

  // Colors for the 3 months - Red, Green, Blue
  const monthColors = ["#ef4444", "#22c55e", "#3b82f6"];

  // Type for chart data
  interface ChartDataPoint {
    salesperson: string;
    name: string;
    [key: `month${number}`]: number;
    [key: `month${number}Label`]: string;
  }

  // Prepare data for Invoice Count chart (Grouped bars)
  const invoiceCountData: ChartDataPoint[] = salespersons.map(sp => {
    const monthData: any = { 
      salesperson: sp.shortName,
      name: sp.name 
    };
    
    recentMonths.forEach((month, index) => {
      const salespersonData = data.find(d => d.salesperson_id === sp.id);
      const monthEntry = salespersonData?.monthly_data?.find(
        (m: any) => m.month === month
      );
      monthData[`month${index + 1}`] = monthEntry?.num_invoices || 0;
      monthData[`month${index + 1}Label`] = month;
    });
    
    return monthData;
  });

  // Prepare data for AUD Amount chart (Grouped bars)
  const audAmountData: ChartDataPoint[] = salespersons.map(sp => {
    const monthData: any = { 
      salesperson: sp.shortName,
      name: sp.name 
    };
    
    recentMonths.forEach((month, index) => {
      const salespersonData = data.find(d => d.salesperson_id === sp.id);
      const monthEntry = salespersonData?.monthly_data?.find(
        (m: any) => m.month === month
      );
      monthData[`month${index + 1}`] = monthEntry?.total_aud || 0;
      monthData[`month${index + 1}Label`] = month;
    });
    
    return monthData;
  });

  // Prepare data for USD Amount chart (Grouped bars)
  const usdAmountData: ChartDataPoint[] = salespersons.map(sp => {
    const monthData: any = { 
      salesperson: sp.shortName,
      name: sp.name 
    };
    
    recentMonths.forEach((month, index) => {
      const salespersonData = data.find(d => d.salesperson_id === sp.id);
      const monthEntry = salespersonData?.monthly_data?.find(
        (m: any) => m.month === month
      );
      monthData[`month${index + 1}`] = monthEntry?.total_usd || 0;
      monthData[`month${index + 1}Label`] = month;
    });
    
    return monthData;
  });

  // Custom tooltip formatter for grouped bars
  const tooltipFormatter: TooltipFormatter = (value, name, props) => {
    if (typeof name === 'string' && name.startsWith('month')) {
      const monthIndex = parseInt(name.replace('month', '')) - 1;
      const monthLabel = props.payload?.[`month${monthIndex + 1}Label`] || recentMonths[monthIndex] || `Month ${monthIndex + 1}`;
      return [value, `Month: ${monthLabel}`];
    }
    return [value, name];
  };

  // Helper function to get label formatter
  const getLabelFormatter = (dataType: 'invoice' | 'aud' | 'usd') => (value: number) => {
    if (value <= 0) return "";
    
    switch (dataType) {
      case 'aud':
        return formatCurrency(value, "AUD").replace("A$", "").replace("$", "");
      case 'usd':
        return formatCurrency(value, "USD").replace("US$", "").replace("$", "");
      default:
        return value.toString();
    }
  };

  return (
    <div className="grid grid-cols-1 print:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {/* 🧾 Chart 1: Invoice Count by Salesperson (Grouped) */}
      <Card className="w-full p-4 print:col-span-2 break-inside-avoid-page print:shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold">
            Invoice Count by Salesperson
          </CardTitle>
          <p className="text-sm text-gray-500">
            Number of invoices per salesperson
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={invoiceCountData}
                margin={{ top: 20, right: 10, left: -20, bottom: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="salesperson"
                  angle={0}
                  textAnchor="middle"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as ChartDataPoint;
                    return `Salesperson: ${item?.name || label}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", marginBottom: "30px" }} />
                
                {/* Grouped bars for each month */}
                {recentMonths.map((month, index) => (
                  <Bar
                    key={`month${index + 1}`}
                    dataKey={`month${index + 1}`}
                    name={month}
                    fill={monthColors[index]}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  >
                    <LabelList
                      dataKey={`month${index + 1}`}
                      position="top"
                      fontSize={10}
                      fill="#666"
                      formatter={getLabelFormatter('invoice')}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 🇦🇺 Chart 2: AUD Amount by Salesperson (Grouped) */}
      <Card className="w-full p-4 break-inside-avoid-page print:shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold">
            AUD Amount by Salesperson
          </CardTitle>
          <p className="text-sm text-gray-500">
            Total AUD per salesperson
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={audAmountData}
                margin={{ top: 20, right: 10, left: 0, bottom: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="salesperson"
                  angle={0}
                  textAnchor="middle"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (typeof name === 'string' && name.startsWith('month')) {
                      const monthIndex = parseInt(name.replace('month', '')) - 1;
                      const monthLabel = audAmountData[0]?.[`month${monthIndex + 1}Label`] || recentMonths[monthIndex];
                      return [
                        formatCurrency(Number(value), "AUD"),
                        `Month: ${monthLabel}`
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as ChartDataPoint;
                    return `Salesperson: ${item?.name || label}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px",  marginBottom: "30px" }} />
                
                {/* Grouped bars for each month */}
                {recentMonths.map((month, index) => (
                  <Bar
                    key={`month${index + 1}`}
                    dataKey={`month${index + 1}`}
                    name={month}
                    fill={monthColors[index]}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  >
                    <LabelList
                      dataKey={`month${index + 1}`}
                      position="top"
                      fontSize={10}
                      fill="#666"
                      formatter={getLabelFormatter('aud')}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 🇺🇸 Chart 3: USD Amount by Salesperson (Grouped) */}
      <Card className="w-full p-4 break-inside-avoid-page print:shadow-none">
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold">
            USD Amount by Salesperson
          </CardTitle>
          <p className="text-sm text-gray-500">
            Total USD per salesperson
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={usdAmountData}
                margin={{ top: 20, right: 10, left: 0, bottom: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="salesperson"
                  angle={0}
                  textAnchor="middle"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (typeof name === 'string' && name.startsWith('month')) {
                      const monthIndex = parseInt(name.replace('month', '')) - 1;
                      const monthLabel = usdAmountData[0]?.[`month${monthIndex + 1}Label`] || recentMonths[monthIndex];
                      return [
                        formatCurrency(Number(value), "USD"),
                        `Month: ${monthLabel}`
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as ChartDataPoint;
                    return `Salesperson: ${item?.name || label}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", marginBottom: "30px" }} />
                
                {/* Grouped bars for each month */}
                {recentMonths.map((month, index) => (
                  <Bar
                    key={`month${index + 1}`}
                    dataKey={`month${index + 1}`}
                    name={month}
                    fill={monthColors[index]}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  >
                    <LabelList
                      dataKey={`month${index + 1}`}
                      position="top"
                      fontSize={10}
                      fill="#666"
                      formatter={getLabelFormatter('usd')}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}