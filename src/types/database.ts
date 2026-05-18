import type {
  User,
  Store,
  Supplier,
  StoreMember,
  ProductCategory,
  Product,
  ProductVariant,
  ProductImage,
  Order,
  Shipment,
  ShipmentOrder,
  CustomerShippingProfile,
  ExchangeRate,
} from './index'

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type InsertRow<T extends { id: string; created_at: string }> = Omit<T, 'id' | 'created_at'>

type UpdateRow<T extends { id: string; created_at: string }> = Partial<Omit<T, 'id' | 'created_at'>>

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: InsertRow<User>
        Update: UpdateRow<User>
        Relationships: Relationship[]
      }
      stores: {
        Row: Store
        Insert: InsertRow<Store>
        Update: UpdateRow<Store>
        Relationships: Relationship[]
      }
      suppliers: {
        Row: Supplier
        Insert: InsertRow<Supplier>
        Update: UpdateRow<Supplier>
        Relationships: Relationship[]
      }
      store_members: {
        Row: StoreMember
        Insert: Omit<StoreMember, 'id' | 'applied_at'>
        Update: Partial<Omit<StoreMember, 'id' | 'applied_at'>>
        Relationships: Relationship[]
      }
      product_categories: {
        Row: ProductCategory
        Insert: InsertRow<ProductCategory>
        Update: Partial<Omit<ProductCategory, 'id' | 'created_at'>>
        Relationships: Relationship[]
      }
      products: {
        Row: Product
        Insert: InsertRow<Product>
        Update: UpdateRow<Product>
        Relationships: Relationship[]
      }
      product_variants: {
        Row: ProductVariant
        Insert: InsertRow<ProductVariant>
        Update: UpdateRow<ProductVariant>
        Relationships: Relationship[]
      }
      product_images: {
        Row: ProductImage
        Insert: InsertRow<ProductImage>
        Update: UpdateRow<ProductImage>
        Relationships: Relationship[]
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id'>
        Update: Partial<Omit<Order, 'id'>>
        Relationships: Relationship[]
      }
      shipments: {
        Row: Shipment
        Insert: InsertRow<Shipment>
        Update: Partial<Omit<Shipment, 'id' | 'created_at'>>
        Relationships: Relationship[]
      }
      shipment_orders: {
        Row: ShipmentOrder
        Insert: ShipmentOrder
        Update: never
        Relationships: Relationship[]
      }
      customer_shipping_profiles: {
        Row: CustomerShippingProfile
        Insert: InsertRow<CustomerShippingProfile>
        Update: Partial<Omit<CustomerShippingProfile, 'id' | 'created_at'>>
        Relationships: Relationship[]
      }
      exchange_rates: {
        Row: ExchangeRate
        Insert: Omit<ExchangeRate, 'id'>
        Update: Partial<Omit<ExchangeRate, 'id'>>
        Relationships: Relationship[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
