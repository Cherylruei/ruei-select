// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { Order, OrderItem, OrderStatus } from '@/types'

const migrationPath = resolve(__dirname, '../../../../supabase/migrations/0007_sprint2_orders.sql')
const sql = readFileSync(migrationPath, 'utf-8')

// ── orders table ───────────────────────────────────────────────────────────────

describe('0007_sprint2_orders.sql — orders table', () => {
  it('orders table 存在', () => {
    expect(sql).toMatch(/CREATE TABLE orders\s*\(/i)
  })

  it('orders.id 欄位正確', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('id')
  })

  it('orders.store_id 欄位正確（FK → stores）', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('store_id')
    expect(tableBlock![1]).toMatch(/REFERENCES stores/i)
  })

  it('orders.member_id 欄位正確（FK → store_members，Sprint 2 設計）', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('member_id')
    expect(tableBlock![1]).toMatch(/REFERENCES store_members/i)
  })

  it('orders.status 欄位有正確的 CHECK constraint', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    const block = tableBlock![1]
    expect(block).toContain('status')
    expect(block).toContain('pending_purchase')
    expect(block).toContain('ordered')
    expect(block).toContain('allocated')
    expect(block).toContain('settled')
    expect(block).toContain('shipped')
    expect(block).toContain('completed')
    expect(block).toContain('cancelled')
  })

  it('orders.note 欄位存在', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('note')
  })

  it('orders.ordered_at 欄位存在', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('ordered_at')
  })

  it('orders.updated_at 欄位存在', () => {
    const tableBlock = sql.match(/CREATE TABLE orders\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('updated_at')
  })
})

// ── order_items table ──────────────────────────────────────────────────────────

describe('0007_sprint2_orders.sql — order_items table', () => {
  it('order_items table 存在', () => {
    expect(sql).toMatch(/CREATE TABLE order_items\s*\(/i)
  })

  it('order_items.order_id 欄位正確（FK → orders）', () => {
    const tableBlock = sql.match(/CREATE TABLE order_items\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('order_id')
    expect(tableBlock![1]).toMatch(/REFERENCES orders/i)
  })

  it('order_items.product_id 欄位正確（FK → products）', () => {
    const tableBlock = sql.match(/CREATE TABLE order_items\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('product_id')
    expect(tableBlock![1]).toMatch(/REFERENCES products/i)
  })

  it('order_items.variant_id 欄位存在（FK → product_variants，選填）', () => {
    const tableBlock = sql.match(/CREATE TABLE order_items\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('variant_id')
    expect(tableBlock![1]).toMatch(/REFERENCES product_variants/i)
  })

  it('order_items.quantity 欄位有 CHECK (quantity > 0)', () => {
    const tableBlock = sql.match(/CREATE TABLE order_items\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    const block = tableBlock![1]
    expect(block).toContain('quantity')
    expect(block).toMatch(/CHECK\s*\(\s*quantity\s*>\s*0\s*\)/i)
  })

  it('order_items.unit_price 欄位存在', () => {
    const tableBlock = sql.match(/CREATE TABLE order_items\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('unit_price')
  })

  it('order_items.unit_cost 欄位存在（選填）', () => {
    const tableBlock = sql.match(/CREATE TABLE order_items\s*\(([\s\S]*?)\);/i)
    expect(tableBlock).toBeTruthy()
    expect(tableBlock![1]).toContain('unit_cost')
  })
})

// ── indexes ────────────────────────────────────────────────────────────────────

describe('0007_sprint2_orders.sql — indexes', () => {
  it('idx_orders_store_id 存在', () => {
    expect(sql).toMatch(/idx_orders_store_id/i)
  })

  it('idx_orders_member_id 存在', () => {
    expect(sql).toMatch(/idx_orders_member_id/i)
  })

  it('idx_orders_status 存在（複合 index: store_id, status）', () => {
    expect(sql).toMatch(/idx_orders_status/i)
  })

  it('idx_order_items_order_id 存在', () => {
    expect(sql).toMatch(/idx_order_items_order_id/i)
  })

  it('idx_order_items_product_id 存在', () => {
    expect(sql).toMatch(/idx_order_items_product_id/i)
  })
})

// ── RLS ────────────────────────────────────────────────────────────────────────

describe('0007_sprint2_orders.sql — RLS', () => {
  it('orders 啟用 RLS', () => {
    expect(sql).toMatch(/ALTER TABLE orders\s+ENABLE ROW LEVEL SECURITY/i)
  })

  it('order_items 啟用 RLS', () => {
    expect(sql).toMatch(/ALTER TABLE order_items\s+ENABLE ROW LEVEL SECURITY/i)
  })

  it('orders_merchant_all policy 存在（商家可操作自己賣場的訂單）', () => {
    expect(sql).toContain('orders_merchant_all')
    expect(sql).toMatch(/owner_id\s*=\s*auth\.uid/i)
  })

  it('order_items_merchant_all policy 存在（商家可操作自己賣場的訂單明細）', () => {
    expect(sql).toContain('order_items_merchant_all')
  })

  it('RLS policy 讓商家 A 無法讀取商家 B 的訂單（policy 透過 store_id → stores.owner_id 過濾）', () => {
    // 驗證 policy 是透過 stores.owner_id = auth.uid() 做存取控制
    // 這表示跨賣場的訂單會被 RLS 擋下，商家只能看自己的訂單
    expect(sql).toMatch(/store_id\s+IN\s*\(\s*SELECT\s+id\s+FROM\s+stores\s+WHERE\s+owner_id/i)
  })

  it('未登入用戶無法讀取 orders（無 anon role policy）', () => {
    // orders 沒有 TO anon 的 SELECT policy，表示未登入用戶無法存取
    const anonOrderPolicy = sql.match(/CREATE POLICY[^;]*ON orders[^;]*TO\s+anon[^;]*/i)
    expect(anonOrderPolicy).toBeNull()
  })
})

// ── Sprint 2 TypeScript types 符合 migration schema ────────────────────────────

describe('Sprint 2 Order TypeScript interface', () => {
  it('Order type 包含 member_id（Sprint 2 設計，取代舊版 customer_id）', () => {
    const order: Order = {
      id: 'order-1',
      store_id: 'store-1',
      member_id: 'member-1',
      status: 'pending_purchase',
      note: null,
      ordered_at: '2026-05-19T00:00:00Z',
      updated_at: '2026-05-19T00:00:00Z',
    }
    expect(order.member_id).toBe('member-1')
    expect(order.store_id).toBe('store-1')
  })

  it('Order.status 接受所有 Sprint 2 合法狀態值', () => {
    const validStatuses: OrderStatus[] = [
      'pending_purchase',
      'ordered',
      'allocated',
      'settled',
      'shipped',
      'completed',
      'cancelled',
    ]
    validStatuses.forEach((status) => {
      const order: Order = {
        id: 'order-1',
        store_id: 'store-1',
        member_id: 'member-1',
        status,
        note: null,
        ordered_at: '2026-05-19T00:00:00Z',
        updated_at: '2026-05-19T00:00:00Z',
      }
      expect(order.status).toBe(status)
    })
  })

  it('OrderItem type 欄位符合 Sprint 2 order_items table 規格', () => {
    const item: OrderItem = {
      id: 'item-1',
      order_id: 'order-1',
      product_id: 'product-1',
      variant_id: null,
      quantity: 2,
      unit_price: 1500,
      unit_cost: null,
      created_at: '2026-05-19T00:00:00Z',
    }
    expect(item.quantity).toBeGreaterThan(0)
    expect(item.unit_price).toBeGreaterThan(0)
    expect(item.variant_id).toBeNull()
  })
})
