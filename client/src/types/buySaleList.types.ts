export type BuySaleItemListRow = {
  normalized_part_number: string;
  item_number: string;
  pem_part_number: string | null;
  captive_part_numbers: string | null;
  description: string | null;
  product_family: string | null;
  bag_quantity: number | null;
  carton_quantity: number | null;
  standard_price_per_1000: number | null;
  carton_price_per_1000: number | null;
  price_list_date: string | null;
  nett_inventory: number | null;
  stock_locations: string | null;
};

export type SavedQuotationListRow = {
  id: number;
  ampec_part_number: string | null;
  customer_part_number: string | null;
  description: string | null;
  quantity: number;
  unit_price_aud_ex_gst: number;
  lead_time: string | null;
  ncnr: string | null;
  remark: string | null;
  created_at: string;
};

export type CursorListResponse<T> = {
  success: boolean;
  message: string;

  data: {
    items: T[];
    next_cursor: string | null;
    has_more: boolean;
    total_count: number;
  };
};
