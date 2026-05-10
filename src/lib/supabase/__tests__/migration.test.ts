import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const migrationPath = resolve(__dirname, '../../../../supabase/migrations/0001_initial.sql')
const sql = readFileSync(migrationPath, 'utf-8')

const REQUIRED_TABLES = [
  'users',
  'stores',
  'suppliers',
  'store_members',
  'product_categories',
  'products',
  'product_specs',
  'orders',
  'shipments',
  'shipment_orders',
  'customer_shipping_profiles',
  'exchange_rates',
]

const REQUIRED_INDEXES = [
  'idx_users_line_id',
  'idx_stores_owner_id',
  'idx_stores_slug',
  'idx_stores_invite_token',
  'idx_suppliers_store_id',
  'idx_store_members_store_id',
  'idx_store_members_status',
  'idx_product_categories_store_id',
  'idx_products_store_id',
  'idx_products_supplier_id',
  'idx_products_status',
  'idx_product_specs_product_id',
  'idx_orders_store_id',
  'idx_orders_customer_id',
  'idx_orders_status',
  'idx_orders_ordered_at',
  'idx_shipments_store_id',
  'idx_shipments_customer_id',
  'idx_shipping_profiles_user_store',
  'idx_shipping_profiles_default',
]

const REQUIRED_COLUMNS: Record<string, string[]> = {
  users: ['id', 'line_id', 'display_name', 'avatar_url', 'role', 'created_at', 'updated_at'],
  stores: ['id', 'owner_id', 'name', 'description', 'avatar_url', 'slug', 'invite_token', 'created_at', 'updated_at'],
  suppliers: ['id', 'store_id', 'name', 'note', 'created_at', 'updated_at'],
  store_members: ['id', 'store_id', 'user_id', 'name', 'phone', 'line_id', 'status', 'applied_at', 'reviewed_at'],
  products: ['id', 'store_id', 'supplier_id', 'category_id', 'name', 'description', 'images', 'sell_price', 'status', 'view_count'],
  orders: ['id', 'store_id', 'customer_id', 'product_id', 'quantity', 'unit_price', 'total_amount', 'status', 'ordered_at'],
  shipments: ['id', 'store_id', 'customer_id', 'shipping_method', 'payment_method', 'recipient_name', 'recipient_phone'],
  exchange_rates: ['id', 'base_currency', 'target_currency', 'rate', 'fetched_at'],
}

describe('0001_initial.sql migration', () => {
  describe('tables', () => {
    REQUIRED_TABLES.forEach((table) => {
      it(`creates table: ${table}`, () => {
        expect(sql).toMatch(new RegExp(`CREATE TABLE ${table}\\s*\\(`, 'i'))
      })
    })
  })

  describe('RLS enabled', () => {
    REQUIRED_TABLES.forEach((table) => {
      it(`enables RLS on: ${table}`, () => {
        expect(sql).toMatch(
          new RegExp(`ALTER TABLE ${table}\\s+ENABLE ROW LEVEL SECURITY`, 'i')
        )
      })
    })
  })

  describe('indexes', () => {
    REQUIRED_INDEXES.forEach((idx) => {
      it(`creates index: ${idx}`, () => {
        expect(sql).toMatch(new RegExp(idx, 'i'))
      })
    })
  })

  describe('required columns', () => {
    Object.entries(REQUIRED_COLUMNS).forEach(([table, columns]) => {
      columns.forEach((col) => {
        it(`${table} has column: ${col}`, () => {
          const tableMatch = sql.match(
            new RegExp(`CREATE TABLE ${table}\\s*\\(([\\s\\S]*?)\\);`, 'i')
          )
          expect(tableMatch, `table ${table} not found`).toBeTruthy()
          expect(tableMatch![1]).toContain(col)
        })
      })
    })
  })

  describe('RLS policies', () => {
    it('has users_select_own policy', () => {
      expect(sql).toContain('users_select_own')
    })

    it('has stores_merchant_all policy', () => {
      expect(sql).toContain('stores_merchant_all')
    })

    it('has suppliers_owner_all policy', () => {
      expect(sql).toContain('suppliers_owner_all')
    })

    it('has store_members_customer_insert policy', () => {
      expect(sql).toContain('store_members_customer_insert')
    })

    it('has products_merchant_all policy', () => {
      expect(sql).toContain('products_merchant_all')
    })

    it('has orders_merchant_all policy', () => {
      expect(sql).toContain('orders_merchant_all')
    })

    it('has exchange_rates_read policy', () => {
      expect(sql).toContain('exchange_rates_read')
    })
  })
})
