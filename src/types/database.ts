import type {
  User,
  Store,
  Supplier,
  StoreMember,
  ProductCategory,
  Product,
  ProductSpec,
  Order,
  Shipment,
  ShipmentOrder,
  CustomerShippingProfile,
  ExchangeRate,
} from './index'

type InsertRow<T extends { id: string; created_at: string }> = Omit<
  T,
  'id' | 'created_at'
>

type UpdateRow<T extends { id: string; created_at: string }> = Partial<
  Omit<T, 'id' | 'created_at'>
>

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: InsertRow<User>
        Update: UpdateRow<User>
      }
      stores: {
        Row: Store
        Insert: InsertRow<Store>
        Update: UpdateRow<Store>
      }
      suppliers: {
        Row: Supplier
        Insert: InsertRow<Supplier>
        Update: UpdateRow<Supplier>
      }
      store_members: {
        Row: StoreMember
        Insert: Omit<StoreMember, 'id' | 'applied_at'>
        Update: Partial<Omit<StoreMember, 'id' | 'applied_at'>>
      }
      product_categories: {
        Row: ProductCategory
        Insert: InsertRow<ProductCategory>
        Update: Partial<Omit<ProductCategory, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: InsertRow<Product>
        Update: UpdateRow<Product>
      }
      product_specs: {
        Row: ProductSpec
        Insert: Omit<ProductSpec, 'id'>
        Update: Partial<Omit<ProductSpec, 'id'>>
      }
      orders: {
        Row: Order
        Insert: InsertRow<Order>
        Update: UpdateRow<Order>
      }
      shipments: {
        Row: Shipment
        Insert: InsertRow<Shipment>
        Update: Partial<Omit<Shipment, 'id' | 'created_at'>>
      }
      shipment_orders: {
        Row: ShipmentOrder
        Insert: ShipmentOrder
        Update: never
      }
      customer_shipping_profiles: {
        Row: CustomerShippingProfile
        Insert: InsertRow<CustomerShippingProfile>
        Update: Partial<Omit<CustomerShippingProfile, 'id' | 'created_at'>>
      }
      exchange_rates: {
        Row: ExchangeRate
        Insert: Omit<ExchangeRate, 'id'>
        Update: Partial<Omit<ExchangeRate, 'id'>>
      }
    }
  }
}
