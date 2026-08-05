import api from "@/lib/api";
import type {
  BuySaleItemListRow,
  CursorListResponse,
  SavedQuotationListRow,
} from "@/types/buySaleList.types";

type ListParams = {
  search?: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
};

export async function getBuySaleItems({
  search = "",
  cursor = null,
  limit = 30,
  signal,
}: ListParams): Promise<CursorListResponse<BuySaleItemListRow>> {
  const response = await api.get<CursorListResponse<BuySaleItemListRow>>(
    "/api/buy-sale/items",
    {
      params: {
        search: search.trim() || undefined,
        cursor: cursor || undefined,
        limit,
      },
      signal,
    },
  );

  return response.data;
}

export async function getSavedBuySaleQuotations({
  search = "",
  cursor = null,
  limit = 30,
  signal,
}: ListParams): Promise<CursorListResponse<SavedQuotationListRow>> {
  const response = await api.get<CursorListResponse<SavedQuotationListRow>>(
    "/api/buy-sale/quotations",
    {
      params: {
        search: search.trim() || undefined,
        cursor: cursor || undefined,
        limit,
      },
      signal,
    },
  );

  return response.data;
}
