import axios from "axios";
import * as React from "react";

import { BuySaleUploadSection } from "@/components/BuySaleUploadSection";
import { CustomerQuoteTable } from "@/components/Customer-QuoteTable";
import { InternalQuoteTable } from "@/components/InternalQuoteTable";
import { QuoteSettingsForm } from "@/components/QuoteSettingsForm";

import {
  calculateQuoteLine,
  createEmptyQuoteLine,
  getPriceForQuantity,
  initialQuoteSettings,
  toNumber,
} from "@/lib/BuySaleCalculations";

import { copyCustomerQuote } from "@/lib/BuySaleClipboard";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import type {
  PartLookupResult,
  PriceType,
  QuoteLine,
  QuoteSettings,
  UploadState,
  UploadType,
} from "@/types/buySale.types";
import { UploadCloud } from "lucide-react";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type UploadResult = {
  imported_rows: number;
  sheet_name?: string;
  price_list_date?: string | null;
};

const uploadEndpoints: Record<UploadType, string> = {
  stock: "/api/buy-sale/uploads/stock",
  mapping: "/api/buy-sale/uploads/mapping",
  price: "/api/buy-sale/uploads/prices",
};

const createInitialUploads = (): Record<UploadType, UploadState> => ({
  stock: {
    file: null,
    loading: false,
    message: "",
    error: "",
  },
  mapping: {
    file: null,
    loading: false,
    message: "",
    error: "",
  },
  price: {
    file: null,
    loading: false,
    message: "",
    error: "",
  },
});

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function uploadBuySaleExcel(params: {
  type: UploadType;
  file: File;
  sheetName?: string;
}): Promise<ApiResponse<UploadResult>> {
  const formData = new FormData();

  formData.append("file", params.file);

  if (params.type === "stock" && params.sheetName) {
    formData.append("sheetName", params.sheetName);
  }

  const response = await api.post<ApiResponse<UploadResult>>(
    uploadEndpoints[params.type],
    formData,
  );

  return response.data;
}

async function lookupBuySalePart(params: {
  partNumber: string;
  location: string;
}): Promise<ApiResponse<PartLookupResult>> {
  const response = await api.get<ApiResponse<PartLookupResult>>(
    "/api/buy-sale/parts/lookup",
    {
      params: {
        partNumber: params.partNumber,
        location: params.location,
      },
    },
  );

  return response.data;
}

export default function BuySale() {
  const [stockSheet, setStockSheet] = React.useState("Kunshan");

  const [uploads, setUploads] = React.useState<Record<UploadType, UploadState>>(
    () => createInitialUploads(),
  );
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);

  const [settings, setSettings] =
    React.useState<QuoteSettings>(initialQuoteSettings);

  const [lines, setLines] = React.useState<QuoteLine[]>(() => [
    createEmptyQuoteLine(),
  ]);

  const [copyMessage, setCopyMessage] = React.useState("");

  const copyMessageTimerRef = React.useRef<number | null>(null);

  const calculatedLines = React.useMemo(
    () => lines.map((line) => calculateQuoteLine(line, settings)),
    [lines, settings],
  );

  React.useEffect(() => {
    return () => {
      if (copyMessageTimerRef.current !== null) {
        window.clearTimeout(copyMessageTimerRef.current);
      }
    };
  }, []);

  const updateSetting = React.useCallback(
    <K extends keyof QuoteSettings>(field: K, value: QuoteSettings[K]) => {
      setSettings((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const updateLine = React.useCallback(
    <K extends keyof QuoteLine>(id: string, field: K, value: QuoteLine[K]) => {
      setLines((current) =>
        current.map((line) =>
          line.id === id
            ? {
                ...line,
                [field]: value,
              }
            : line,
        ),
      );
    },
    [],
  );

  const patchLine = React.useCallback(
    (id: string, values: Partial<QuoteLine>) => {
      setLines((current) =>
        current.map((line) =>
          line.id === id
            ? {
                ...line,
                ...values,
              }
            : line,
        ),
      );
    },
    [],
  );

  const addLine = React.useCallback(() => {
    setLines((current) => [...current, createEmptyQuoteLine()]);
  }, []);

  const removeLine = React.useCallback((id: string) => {
    setLines((current) => {
      const remainingLines = current.filter((line) => line.id !== id);

      return remainingLines.length > 0
        ? remainingLines
        : [createEmptyQuoteLine()];
    });
  }, []);

  const changePriceType = React.useCallback(
    (id: string, priceType: PriceType) => {
      setLines((current) =>
        current.map((line) => {
          if (line.id !== id) {
            return line;
          }

          let itemPriceUsd = line.itemPriceUsd;

          if (priceType === "standard") {
            itemPriceUsd = toNumber(line.standardUnitPrice);
          }

          if (priceType === "carton") {
            itemPriceUsd = toNumber(line.cartonUnitPrice);
          }

          return {
            ...line,
            priceType,
            itemPriceUsd,
          };
        }),
      );
    },
    [],
  );

  const updateRequiredQuantity = React.useCallback(
    (id: string, requiredQuantity: number) => {
      setLines((current) =>
        current.map((line) => {
          if (line.id !== id) {
            return line;
          }

          const updatedLine: QuoteLine = {
            ...line,
            requiredQuantity,
          };

          const selectedPrice = getPriceForQuantity(
            updatedLine,
            requiredQuantity,
          );

          return {
            ...updatedLine,
            priceType: selectedPrice.priceType,
            itemPriceUsd: selectedPrice.itemPriceUsd,
          };
        }),
      );
    },
    [],
  );

  const searchPart = React.useCallback(
    async (id: string) => {
      const line = lines.find((item) => item.id === id);

      const partNumber = line?.enteredPartNumber.trim();

      if (!line || !partNumber) {
        patchLine(id, {
          searchMessage: "Enter a part number.",
        });

        return;
      }

      if (line.searching) {
        return;
      }

      patchLine(id, {
        searching: true,
        searchMessage: "",
      });

      try {
        const response = await lookupBuySalePart({
          partNumber,
          location: stockSheet,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || "Part search failed.");
        }

        const data = response.data;

        const temporaryLine: QuoteLine = {
          ...line,

          enteredPartNumber: data.enteredPartNumber || partNumber,

          ampecPartNumber: data.ampecPartNumber || partNumber,

          customerPartNumber: data.customerPartNumber || "",

          description: data.description || "",

          stockQuantity: toNumber(data.stockQuantity),

          stockLocation: data.stockLocation || stockSheet,

          bagQuantity:
            data.bagQuantity !== null && data.bagQuantity !== undefined
              ? toNumber(data.bagQuantity)
              : null,

          cartonQuantity:
            data.cartonQuantity !== null && data.cartonQuantity !== undefined
              ? toNumber(data.cartonQuantity)
              : null,

          standardPricePer1000:
            data.standardPricePer1000 !== null &&
            data.standardPricePer1000 !== undefined
              ? toNumber(data.standardPricePer1000)
              : null,

          cartonPricePer1000:
            data.cartonPricePer1000 !== null &&
            data.cartonPricePer1000 !== undefined
              ? toNumber(data.cartonPricePer1000)
              : null,

          standardUnitPrice:
            data.standardUnitPrice !== null &&
            data.standardUnitPrice !== undefined
              ? toNumber(data.standardUnitPrice)
              : null,

          cartonUnitPrice:
            data.cartonUnitPrice !== null && data.cartonUnitPrice !== undefined
              ? toNumber(data.cartonUnitPrice)
              : null,

          searching: false,
          searchMessage: "",
        };

        const selectedPrice = getPriceForQuantity(
          temporaryLine,
          temporaryLine.requiredQuantity,
        );

        patchLine(id, {
          enteredPartNumber: temporaryLine.enteredPartNumber,

          ampecPartNumber: temporaryLine.ampecPartNumber,

          customerPartNumber: temporaryLine.customerPartNumber,

          description: temporaryLine.description,

          stockQuantity: temporaryLine.stockQuantity,

          stockLocation: temporaryLine.stockLocation,

          bagQuantity: temporaryLine.bagQuantity,

          cartonQuantity: temporaryLine.cartonQuantity,

          standardPricePer1000: temporaryLine.standardPricePer1000,

          cartonPricePer1000: temporaryLine.cartonPricePer1000,

          standardUnitPrice: temporaryLine.standardUnitPrice,

          cartonUnitPrice: temporaryLine.cartonUnitPrice,

          priceType: selectedPrice.priceType,

          itemPriceUsd: selectedPrice.itemPriceUsd,

          searching: false,

          searchMessage:
            data.matchType === "mapping"
              ? `Mapped ${data.enteredPartNumber} to ${data.ampecPartNumber}.`
              : response.message || "Part found.",
        });
      } catch (error: unknown) {
        patchLine(id, {
          searching: false,

          searchMessage: getErrorMessage(error, "Part search failed."),
        });
      }
    },
    [lines, patchLine, stockSheet],
  );

  const updateUploadFile = React.useCallback(
    (type: UploadType, file: File | null) => {
      setUploads((current) => ({
        ...current,
        [type]: {
          ...current[type],
          file,
          message: "",
          error: "",
        },
      }));
    },
    [],
  );

  const uploadExcel = React.useCallback(
    async (type: UploadType) => {
      const uploadState = uploads[type];

      if (!uploadState.file || uploadState.loading) {
        return;
      }

      setUploads((current) => ({
        ...current,
        [type]: {
          ...current[type],
          loading: true,
          message: "",
          error: "",
        },
      }));

      try {
        const response = await uploadBuySaleExcel({
          type,
          file: uploadState.file,
          sheetName: type === "stock" ? stockSheet : undefined,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || "Excel upload failed.");
        }

        const importedRows = toNumber(response.data.imported_rows);

        let successMessage =
          response.message || `${importedRows} rows imported successfully.`;

        if (type === "stock" && response.data.sheet_name) {
          successMessage += ` Sheet: ${response.data.sheet_name}.`;
        }

        if (type === "price" && response.data.price_list_date) {
          successMessage += ` Price list date: ${response.data.price_list_date}.`;
        }

        setUploads((current) => ({
          ...current,
          [type]: {
            file: null,
            loading: false,
            message: successMessage,
            error: "",
          },
        }));
      } catch (error: unknown) {
        setUploads((current) => ({
          ...current,
          [type]: {
            ...current[type],
            loading: false,
            message: "",
            error: getErrorMessage(error, "Excel upload failed."),
          },
        }));
      }
    },
    [stockSheet, uploads],
  );

  const handleCopy = React.useCallback(async () => {
    try {
      await copyCustomerQuote(calculatedLines, settings);

      setCopyMessage("Quotation copied. Paste it into Outlook.");

      if (copyMessageTimerRef.current !== null) {
        window.clearTimeout(copyMessageTimerRef.current);
      }

      copyMessageTimerRef.current = window.setTimeout(() => {
        setCopyMessage("");
        copyMessageTimerRef.current = null;
      }, 3000);
    } catch (error: unknown) {
      setCopyMessage(getErrorMessage(error, "Unable to copy the quotation."));
    }
  }, [calculatedLines, settings]);

  const clearQuote = React.useCallback(() => {
    setSettings(initialQuoteSettings);
    setLines([createEmptyQuoteLine()]);
    setCopyMessage("");

    if (copyMessageTimerRef.current !== null) {
      window.clearTimeout(copyMessageTimerRef.current);

      copyMessageTimerRef.current = null;
    }
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Buy - Sale Quote
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Search parts, calculate prices and prepare customer quotations.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className=""
        >
          <UploadCloud className="size-4" />
          Update Data
        </Button>
      </header>

      <QuoteSettingsForm settings={settings} onChange={updateSetting} />

      <InternalQuoteTable
        lines={calculatedLines}
        onAdd={addLine}
        onRemove={removeLine}
        onSearch={searchPart}
        onUpdate={updateLine}
        onRequiredQuantityChange={updateRequiredQuantity}
        onPriceTypeChange={changePriceType}
      />

      <CustomerQuoteTable
        lines={calculatedLines}
        settings={settings}
        copyMessage={copyMessage}
        onCopy={handleCopy}
        onClear={clearQuote}
        onUpdate={updateLine}
      />

      <BuySaleUploadSection
        open={uploadModalOpen}
        stockSheet={stockSheet}
        uploads={uploads}
        onClose={() => setUploadModalOpen(false)}
        onStockSheetChange={setStockSheet}
        onFileChange={updateUploadFile}
        onUpload={uploadExcel}
      />
    </div>
  );
}
