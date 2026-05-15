// ══════════════════════════════════════════════════════════════
// 芮選系統 TypeScript Types
// ══════════════════════════════════════════════════════════════

export type UserRole = 'merchant' | 'customer'
export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type Currency = 'TWD' | 'JPY' | 'GBP' | 'USD' | 'HKD'
export type ProductStatus = 'active' | 'inactive' | 'soldout'
export type OrderStatus =
  | 'pending_purchase'
  | 'ordered'
  | 'allocated'
  | 'settled'
  | 'shipped'
  | 'completed'
  | 'cancelled'
export type ShippingMethod = 'pickup' | 'convenience' | 'seller_delivery' | 'home_delivery'
export type PaymentMethod = 'cash' | 'transfer' | 'cod'

export interface User {
  id: string
  line_id: string
  display_name: string
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Store {
  id: string
  owner_id: string
  name: string
  description: string | null
  avatar_url: string | null
  slug: string
  invite_token: string
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  store_id: string
  name: string
  note: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export interface StoreMember {
  id: string
  store_id: string
  user_id: string
  name: string
  phone: string
  line_id: string
  status: MemberStatus
  applied_at: string
  reviewed_at: string | null
}

export interface ProductCategory {
  id: string
  store_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  store_id: string
  supplier_id: string | null
  category_id: string | null
  name: string
  description: string | null
  description_raw: string | null
  images: string[]
  wholesale_price: number | null
  sell_price: number
  currency: Currency
  original_price: number | null
  exchange_rate: number | null
  status: ProductStatus
  view_count: number
  created_at: string
  updated_at: string
}

export interface ProductSpec {
  id: string
  product_id: string
  name: string
  values: string[]
  sort_order: number
}

export interface Order {
  id: string
  store_id: string
  customer_id: string
  product_id: string
  supplier_id: string | null
  spec_selected: Record<string, string>
  quantity: number
  unit_price: number
  unit_cost: number | null
  total_amount: number
  status: OrderStatus
  ordered_at: string
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

export interface Shipment {
  id: string
  store_id: string
  customer_id: string
  shipping_method: ShippingMethod
  payment_method: PaymentMethod
  recipient_name: string
  recipient_phone: string
  store_name: string | null
  address: string | null
  shipping_fee: number
  tracking_number: string | null
  shipped_at: string | null
  created_at: string
}

export interface ShipmentOrder {
  shipment_id: string
  order_id: string
}

export interface CustomerShippingProfile {
  id: string
  user_id: string
  store_id: string
  label: string | null
  shipping_method: ShippingMethod
  payment_method: PaymentMethod
  recipient_name: string
  recipient_phone: string
  store_name: string | null
  address: string | null
  is_default: boolean
  used_at: string | null
  created_at: string
}

export interface ExchangeRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  fetched_at: string
}
