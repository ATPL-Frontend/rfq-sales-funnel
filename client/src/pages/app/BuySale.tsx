import axios from "axios";

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
  CalculatedQuoteLine,
  PartLookupResult,
  PriceType,
  QuoteLine,
  QuoteSettings,
  UploadState,
  UploadType,
} from "@/types/buySale.types";
import { UploadCloud } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type SaveQuotationResponse = {
  success: boolean;
  message: string;
  data: {
    inserted_rows: number;
    first_inserted_id: number;
  };
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

export const createInitialUploads = (): Record<UploadType, UploadState> => ({
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

export async function saveBuySaleQuotation(
  lines: CalculatedQuoteLine[],
): Promise<SaveQuotationResponse> {
  const response = await api.post<SaveQuotationResponse>(
    "/api/buy-sale/quotations",
    {
      lines,
    },
  );

  return response.data;
}

export function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
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

export async function uploadBuySaleExcel(params: {
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
  const [stockSheet, setStockSheet] = useState("Kunshan");

  const [uploads, setUploads] = useState<Record<UploadType, UploadState>>(() =>
    createInitialUploads(),
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [settings, setSettings] = useState<QuoteSettings>(initialQuoteSettings);

  const [lines, setLines] = useState<QuoteLine[]>(() => [
    createEmptyQuoteLine(),
  ]);

  const calculatedLines = useMemo(
    () => lines.map((line) => calculateQuoteLine(line, settings)),
    [lines, settings],
  );

  const [savingQuote, setSavingQuote] = useState(false);

  const handleSaveQuotation = useCallback(async () => {
    if (savingQuote) {
      return;
    }

    const validLines = calculatedLines.filter(
      (line) =>
        line.ampecPartNumber.trim() ||
        line.customerPartNumber.trim() ||
        line.description.trim(),
    );

    if (!validLines.length) {
      toast.error("Add at least one quotation item before saving.");
      return;
    }

    setSavingQuote(true);

    const loadingToastId = toast.loading("Saving quotation...");

    try {
      const response = await saveBuySaleQuotation(validLines);

      toast.success(response.message, {
        id: loadingToastId,
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to save the quotation."), {
        id: loadingToastId,
      });
    } finally {
      setSavingQuote(false);
    }
  }, [calculatedLines, savingQuote]);

  const updateSetting = useCallback(
    <K extends keyof QuoteSettings>(field: K, value: QuoteSettings[K]) => {
      setSettings((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const updateLine = useCallback(
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

  const patchLine = useCallback((id: string, values: Partial<QuoteLine>) => {
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
  }, []);

  const addLine = useCallback(() => {
    setLines((current) => [...current, createEmptyQuoteLine()]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((current) => {
      const remainingLines = current.filter((line) => line.id !== id);

      return remainingLines.length > 0
        ? remainingLines
        : [createEmptyQuoteLine()];
    });
  }, []);

  const changePriceType = useCallback((id: string, priceType: PriceType) => {
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
  }, []);

  const updateRequiredQuantity = useCallback(
    (id: string, requiredQuantity: number) => {
      setLines((current) =>
        current.map((line) => {
          if (line.id !== id) {
            return line;
          }

          const updatedLine: QuoteLine = {
            ...line,
            requiredQuantity,
            moq: requiredQuantity,
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

  const searchPart = useCallback(
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

          ampecPartNumber: data.enteredPartNumber || partNumber,

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

          ampecPartNumber: temporaryLine.enteredPartNumber,

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

  const updateUploadFile = useCallback(
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

  const uploadExcel = useCallback(
    async (type: UploadType, file: File) => {
      if (!file) {
        return;
      }

      setUploads((current) => ({
        ...current,
        [type]: {
          ...current[type],
          file,
          loading: true,
          message: "",
          error: "",
        },
      }));

      try {
        const response = await uploadBuySaleExcel({
          type,
          file,
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
        const message = getErrorMessage(error, "Excel upload failed.");

        setUploads((current) => ({
          ...current,
          [type]: {
            ...current[type],
            file,
            loading: false,
            message: "",
            error: message,
          },
        }));

        throw error;
      }
    },
    [stockSheet],
  );

  const handleCopy = useCallback(async () => {
    try {
      await copyCustomerQuote(calculatedLines, settings);

      toast.success("Quotation copied successfully.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to copy quotation."));
    }
  }, [calculatedLines, settings]);

  const clearQuote = useCallback(() => {
    setSettings(initialQuoteSettings);
    setLines([createEmptyQuoteLine()]);
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buy - Sale Quote</h1>

          <p className="mt-1 text-sm text-slate-500">
            Search parts, calculate prices and prepare customer quotations.
          </p>
        </div>

        <Button type="button" onClick={() => setUploadModalOpen(true)}>
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
        onCopy={handleCopy}
        onClear={clearQuote}
        onUpdate={updateLine}
        saving={savingQuote}
        onSave={handleSaveQuotation}
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
