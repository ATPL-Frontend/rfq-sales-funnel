export type UserList = {
  id: number;
  name: string;
  email: string;
  short_form: string;
  user_type: "system_user" | "sales_person";
  is_active: boolean;
  created_at: string;
  role_name: string[];
};

export type Users = {
  id: number;
  name: string;
  short_form: string;
  role_name: string;
};

export type CustomerList = {
  id: number;
  name: string;
  email: string[];
  web_address: string;
  code: string;
  created_at: string;
  updated_at: string;
};

export type Customers = {
  id: number;
  name: string;
  email: string | string[];
  code: string;
};

export type SalesPerson = {
  id: number;
  name: string;
  short_form: string;
};

export type Invoice = {
  id: number;
  invoice_date: string;
  customer_name: string;
  invoice_no: string;
  customer_email: string | string[];
  customer_id: number;
  customer_code: string;
  amount: number | string;
  currency: string;
  gst: boolean;
  created_at: string;
};

export type Rfq = {
  id: number;
  receive_date: string;
  start_date: string;
  customer_id: number;
  salesperson_id: number;
  quantity: number;
  price: number;
  currency: string;
  prepared_by: number[];
  end_date: string;
  progress: string;
  rfq_location: string;
  remarks: string;
};

export type SalesFunnel = {
  id: number;
  rfq_id: number;
  customer_id: number;
  salesperson_id: number;
  created_at: string;
  updated_at: string;
};
