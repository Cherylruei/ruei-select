// ══════════════════════════════════════════════════════════════
// 芮選系統 TypeScript Types
// ══════════════════════════════════════════════════════════════

export type UserRole = 'merchant' | 'customer'
export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type MemberSource = 'invite_link' | 'public_page'
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
  allow_public_products: boolean
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
  phone: string | null
  line_id: string
  status: MemberStatus
  source: MemberSource
  referring_product_id: string | null
  note: string | null
  applied_at: string
  reviewed_at: string | null
}

export interface StoreMemberWithProduct extends StoreMember {
  referring_product_name: string | null
}

export interface ProductCategory {
  id: string
  store_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  specs: Record<string, string> // {"顏色": "紅", "尺寸": "M"}
  price: number
  cost: number | null
  cost_currency: Currency
  created_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
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
  description_raw: string | null // 廠商原始商品文（= original_text）
  images: string[]
  sell_price: number | null // 無 variants 時的基本售價
  is_public: boolean
  status: ProductStatus
  ends_at: string | null
  view_count: number
  created_at: string
  updated_at: string
  // joined relations
  variants?: ProductVariant[]
  product_images?: ProductImage[]
  supplier?: Supplier | null
}

export interface ProductWithDetails extends Product {
  variants: ProductVariant[]
  product_images: ProductImage[]
  supplier: Supplier | null
}

export interface Order {
  id: string
  store_id: string
  member_id: string
  status: OrderStatus
  note: string | null
  ordered_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  unit_cost: number | null
  created_at: string
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

// AI 文案優化回傳格式
export interface CopywritingResult {
  name: string
  description: string
  detectedVariants: {
    dimension: string // e.g. "顏色"
    options: string[] // e.g. ["紅", "藍", "白"]
    prices?: number[] // 與 options 對應的售價（有標價時才有）
  }[]
}
