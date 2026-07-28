import type {
  CalculatedQuoteLine,
  PriceType,
  QuoteLine,
  QuoteSettings,
} from "@/types/buySale.types";

export const initialQuoteSettings: QuoteSettings = {
  usdToAudRate: 1.6,
  audToUsdRate: 0.75,
  componentMargin: 30,
  shippingMargin: 30,
  freightCharge: 18.5,
  freightNote: "Up to 15 Kgs",
};

export function createEmptyQuoteLine(): QuoteLine {
  return {
    id: crypto.randomUUID(),

    enteredPartNumber: "",
    ampecPartNumber: "",
    customerPartNumber: "",
    revision: "",
    description: "",

    requiredQuantity: 1,
    stockQuantity: 0,
    stockLocation: "Kunshan",

    priceType: "manual",
    itemPriceUsd: 0,

    bagQuantity: null,
    cartonQuantity: null,

    standardPricePer1000: null,
    cartonPricePer1000: null,

    standardUnitPrice: null,
    cartonUnitPrice: null,

    leadTime: "",
    ncnr: "Yes",
    remark: "",

    searching: false,
    searchMessage: "",
  };
}

export function toNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function applyMargin(value: number, marginPercentage: number): number {
  const margin = toNumber(marginPercentage);

  if (value <= 0) {
    return 0;
  }

  if (margin >= 100) {
    return value;
  }

  return value / (1 - margin / 100);
}

export function getPriceForQuantity(
  line: QuoteLine,
  quantity: number,
): {
  priceType: PriceType;
  itemPriceUsd: number;
} {
  const requiredQuantity = toNumber(quantity);

  const hasCartonPrice =
    line.cartonQuantity !== null &&
    line.cartonQuantity > 0 &&
    line.cartonUnitPrice !== null &&
    line.cartonUnitPrice > 0;

  if (hasCartonPrice && requiredQuantity >= toNumber(line.cartonQuantity)) {
    return {
      priceType: "carton",
      itemPriceUsd: toNumber(line.cartonUnitPrice),
    };
  }

  if (line.standardUnitPrice !== null && line.standardUnitPrice > 0) {
    return {
      priceType: "standard",
      itemPriceUsd: toNumber(line.standardUnitPrice),
    };
  }

  return {
    priceType: "manual",
    itemPriceUsd: toNumber(line.itemPriceUsd),
  };
}

export function calculateQuoteLine(
  line: QuoteLine,
  settings: QuoteSettings,
): CalculatedQuoteLine {
  const convertedPriceAud =
    toNumber(line.itemPriceUsd) * toNumber(settings.usdToAudRate);

  const componentSellingPriceAud = applyMargin(
    convertedPriceAud,
    settings.componentMargin,
  );

  const finalUnitPriceAud = applyMargin(
    componentSellingPriceAud,
    settings.shippingMargin,
  );

  const finalUnitPriceUsd = finalUnitPriceAud * toNumber(settings.audToUsdRate);

  let moq: number | null = null;

  if (line.priceType === "standard") {
    moq = line.bagQuantity;
  }

  if (line.priceType === "carton") {
    moq = line.cartonQuantity;
  }

  return {
    ...line,

    convertedPriceAud: roundCurrency(convertedPriceAud),

    componentSellingPriceAud: roundCurrency(componentSellingPriceAud),

    finalUnitPriceAud: roundCurrency(finalUnitPriceAud),

    finalUnitPriceUsd: roundCurrency(finalUnitPriceUsd),

    moq,
  };
}

export function formatCurrency(value: number, currency: "AUD" | "USD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}
