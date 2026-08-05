export type UploadType = "stock" | "mapping" | "price";

export type PriceType = "manual" | "standard" | "carton";

export type QuoteSettings = {
  usdToAudRate: number;
  audToUsdRate: number;
  componentMargin: number;
  shippingMargin: number;
  freightCharge: number;
  freightNote: string;
};

export type UploadState = {
  file: File | null;
  loading: boolean;
  message: string;
  error: string;
};

export type QuoteLine = {
  id: string;

  enteredPartNumber: string;
  ampecPartNumber: string;
  customerPartNumber: string;
  description: string;

  requiredQuantity: number;
  moq: number;

  stockQuantity: number;
  stockLocation: string;

  priceType: PriceType;
  itemPriceUsd: number;

  bagQuantity: number | null;
  cartonQuantity: number | null;

  standardPricePer1000: number | null;
  cartonPricePer1000: number | null;

  standardUnitPrice: number | null;
  cartonUnitPrice: number | null;

  leadTime: string;
  ncnr: string;
  remark: string;

  searching: boolean;
  searchMessage: string;
};

export type CalculatedQuoteLine = QuoteLine & {
  convertedPriceAud: number;
  componentSellingPriceAud: number;
  finalUnitPriceAud: number;
  finalUnitPriceUsd: number;
};

export type PartLookupResult = {
  enteredPartNumber: string;
  ampecPartNumber: string;
  customerPartNumber: string;
  description: string;

  matchType: "direct" | "mapping";

  stockQuantity: number;
  stockLocation: string;

  bagQuantity: number | null;
  cartonQuantity: number | null;

  standardPricePer1000: number | null;
  cartonPricePer1000: number | null;

  standardUnitPrice: number | null;
  cartonUnitPrice: number | null;

  priceListDate: string | null;
};
