"use client";

import type { QuoteSettings } from "../types/buySale.types";
import { toNumber } from "../lib/BuySaleCalculations";

type Props = {
  settings: QuoteSettings;
  onChange: <K extends keyof QuoteSettings>(
    field: K,
    value: QuoteSettings[K],
  ) => void;
};

const numberFields: Array<{
  field: keyof Pick<
    QuoteSettings,
    | "usdToAudRate"
    | "audToUsdRate"
    | "componentMargin"
    | "shippingMargin"
    | "freightCharge"
  >;
  label: string;
}> = [
  { field: "usdToAudRate", label: "USD to AUD" },
  { field: "componentMargin", label: "Component margin %" },
  { field: "shippingMargin", label: "Shipping margin %" },
  { field: "audToUsdRate", label: "AUD to USD" },
  { field: "freightCharge", label: "Freight charge AUD" },
];

export function QuoteSettingsForm({ settings, onChange }: Props) {
  return (
    <section className="rounded-xl border bg-white dark:bg-slate-800 p-4 shadow-sm">
      <h2 className="mb-4 font-semibold">
        Quote calculation settings
      </h2>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 text-sm">
        {numberFields.map(({ field, label }) => (
          <label key={field}>
            <span className="mb-1 block font-medium text-primary">{label}</span>

            <input
              type="number"
              step="0.01"
              value={settings[field]}
              onChange={(event) =>
                onChange(field, toNumber(event.target.value))
              }
              className="h-10 w-full rounded-lg border px-3"
            />
          </label>
        ))}

        <label>
          <span className="mb-1 block text-sm font-medium text-primary">
            Freight note
          </span>

          <input
            value={settings.freightNote}
            onChange={(event) =>
              onChange("freightNote", event.target.value)
            }
            className="h-10 w-full rounded-lg border px-3"
          />
        </label>
      </div>
    </section>
  );
}