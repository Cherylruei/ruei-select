-- Sprint 5: 顧客管理後台重設計 — 新增拒絕原因欄位
ALTER TABLE store_members
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
