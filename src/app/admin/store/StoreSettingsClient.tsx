'use client'

import { useState, useRef, useTransition } from 'react'
import type { Store } from '@/types'

interface Props {
  initialStore: Store | null
  appUrl: string
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

export default function StoreSettingsClient({ initialStore, appUrl }: Props) {
  const [store, setStore] = useState<Store | null>(initialStore)
  const [name, setName] = useState(initialStore?.name ?? '')
  const [description, setDescription] = useState(initialStore?.description ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialStore?.avatar_url ?? null
  )
  const [toast, setToast] = useState<ToastState | null>(null)
  const [copyLabel, setCopyLabel] = useState('複製連結')
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoading = isPending || isUploading

  function showToast(message: string, type: ToastState['type']) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleAvatarClick() {
    if (!isLoading) fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('僅支援 JPG / PNG / WebP 格式', 'error')
      return
    }
    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  async function compressImage(file: File): Promise<File> {
    const { default: imageCompression } = await import('browser-image-compression')
    return imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    })
  }

  async function uploadAvatar(storeId: string, file: File): Promise<string> {
    setIsUploading(true)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('avatar', compressed, compressed.name || 'avatar')
      const res = await fetch(`/api/store/${storeId}/avatar`, { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || '上傳失敗')
      return body.data.avatar_url as string
    } finally {
      setIsUploading(false)
    }
  }

  function handleReset() {
    setName(store?.name ?? '')
    setDescription(store?.description ?? '')
    setAvatarFile(null)
    setAvatarPreview(store?.avatar_url ?? null)
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      showToast('賣場名稱至少需要 2 個字', 'error')
      return
    }
    if (name.trim().length > 30) {
      showToast('賣場名稱不能超過 30 個字', 'error')
      return
    }
    if (description.length > 200) {
      showToast('賣場介紹不能超過 200 個字', 'error')
      return
    }

    startTransition(async () => {
      try {
        let savedStore: Store

        if (!store) {
          // Create store
          const res = await fetch('/api/store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
          })
          const body = await res.json()
          if (!res.ok) {
            showToast(body.error || '儲存失敗', 'error')
            return
          }
          savedStore = body.data as Store
        } else {
          // Update store (without avatar first)
          const res = await fetch(`/api/store/${store.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
          })
          const body = await res.json()
          if (!res.ok) {
            showToast(body.error || '儲存失敗', 'error')
            return
          }
          savedStore = body.data as Store
        }

        // Upload avatar if selected
        if (avatarFile) {
          try {
            const avatarUrl = await uploadAvatar(savedStore.id, avatarFile)
            savedStore = { ...savedStore, avatar_url: avatarUrl }
            setAvatarFile(null)
          } catch (err) {
            showToast(err instanceof Error ? err.message : '頭像上傳失敗', 'error')
          }
        }

        setStore(savedStore)
        setName(savedStore.name)
        setDescription(savedStore.description ?? '')
        setAvatarPreview(savedStore.avatar_url)
        showToast('賣場資訊已更新', 'success')
      } catch {
        showToast('儲存失敗，請稍後再試', 'error')
      }
    })
  }

  async function handleCopyLink() {
    if (!store) return
    const link = `${appUrl}/store/${store.slug}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const el = document.createElement('textarea')
      el.value = link
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopyLabel('已複製 ✓')
    setTimeout(() => setCopyLabel('複製連結'), 2000)
  }

  async function handleRegenToken() {
    if (!store) return
    setShowRegenModal(false)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/store/${store.id}/invite-token`, { method: 'POST' })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '重新產生失敗', 'error')
          return
        }
        setStore((prev) => (prev ? { ...prev, invite_token: body.data.invite_token } : prev))
        showToast('邀請連結已更新', 'success')
      } catch {
        showToast('重新產生失敗，請稍後再試', 'error')
      }
    })
  }

  const inviteLink = store ? `${appUrl}/store/${store.slug}` : null
  const avatarInitial = name.trim().slice(0, 1) || '芮'

  return (
    <>
      {/* ── Section 1: Store basic info ─────────────────────────────────────── */}
      <section className='store-card'>
        <div className='store-card-head'>
          <h2 className='store-card-title'>賣場基本資訊</h2>
          <span className='store-card-hint'>儲存後將同步至顧客端</span>
        </div>

        <div className='store-info-grid'>
          {/* Avatar */}
          <div className='store-avatar-wrap'>
            <button
              type='button'
              aria-label='更換頭像'
              className='store-avatar'
              onClick={handleAvatarClick}
              disabled={isLoading}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt='賣場頭像'
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <span className='store-avatar-initial'>{avatarInitial}</span>
              )}
              <div className='store-avatar-overlay' aria-hidden='true'>
                <svg
                  viewBox='0 0 24 24'
                  width='14'
                  height='14'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                >
                  <path d='M12 20h9' />
                  <path d='M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z' />
                </svg>
                更換頭像
              </div>
              {isUploading && <div className='store-avatar-loading' aria-label='上傳中' />}
            </button>
            <span className='store-avatar-cap'>
              建議 400×400px
              <br />
              JPG / PNG
            </span>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              style={{ display: 'none' }}
              onChange={handleFileChange}
              aria-label='上傳頭像'
            />
          </div>

          {/* Form */}
          <div className='store-form'>
            <div className='store-form-row'>
              <label htmlFor='storeName' className='store-form-label'>
                賣場名稱<span className='store-form-req'>*</span>
              </label>
              <input
                id='storeName'
                type='text'
                className='store-input'
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                disabled={isLoading}
                placeholder='請輸入賣場名稱'
              />
              <div className='store-form-meta'>
                <span>顧客將看到的店家名稱</span>
                <span
                  className={
                    name.length < 2 && name.length > 0 ? 'store-count-error' : 'store-count'
                  }
                >
                  {name.length} / 30
                </span>
              </div>
            </div>

            <div className='store-form-row'>
              <label htmlFor='storeDesc' className='store-form-label'>
                賣場介紹
              </label>
              <textarea
                id='storeDesc'
                className='store-textarea'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={4}
                disabled={isLoading}
                placeholder='例：日韓代購精選，主打女裝、配件與生活雜貨。每月固定收單兩次，週三截止。'
              />
              <div className='store-form-meta'>
                <span>最多 200 字，可包含營業時間、聯絡方式</span>
                <span className={description.length > 200 ? 'store-count-error' : 'store-count'}>
                  {description.length} / 200
                </span>
              </div>
            </div>

            <div className='store-form-actions'>
              <button
                type='button'
                className='store-btn store-btn-ghost'
                onClick={handleReset}
                disabled={isLoading}
              >
                取消變更
              </button>
              <button
                type='button'
                className='store-btn store-btn-primary'
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className='store-btn-spinner' aria-hidden='true' />
                ) : (
                  <svg
                    viewBox='0 0 24 24'
                    width='14'
                    height='14'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                )}
                {isLoading ? '儲存中…' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Invite link ──────────────────────────────────────────── */}
      <section className='store-card'>
        <div className='store-card-head'>
          <h2 className='store-card-title'>顧客邀請連結</h2>
          <span className='store-card-hint'>透過此連結邀請顧客加入</span>
        </div>

        {!store ? (
          <p className='store-invite-empty'>請先儲存賣場基本資訊，系統將自動產生邀請連結。</p>
        ) : (
          <>
            <p className='store-invite-note' style={{ marginBottom: 14 }}>
              將以下連結分享給顧客，顧客點擊後可申請加入賣場。商家審核通過後，顧客即可瀏覽商品與下單。
            </p>
            <div className='store-invite-row'>
              <div className='store-invite-link'>
                <svg
                  viewBox='0 0 24 24'
                  width='14'
                  height='14'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='M10 13a5 5 0 007.07 0l3-3a5 5 0 10-7.07-7.07l-1 1' />
                  <path d='M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 107.07 7.07l1-1' />
                </svg>
                {inviteLink}
              </div>
              <button
                type='button'
                className='store-btn store-btn-primary'
                onClick={handleCopyLink}
                disabled={isLoading}
              >
                <svg
                  viewBox='0 0 24 24'
                  width='14'
                  height='14'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <rect x='9' y='9' width='13' height='13' rx='2' />
                  <path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
                </svg>
                {copyLabel}
              </button>
            </div>
            <div className='store-invite-footer'>
              <span className='store-invite-note'>舊連結點擊後將顯示「此連結已失效」。</span>
              <button
                type='button'
                className='store-btn-warning'
                onClick={() => setShowRegenModal(true)}
                disabled={isLoading}
              >
                <svg
                  viewBox='0 0 24 24'
                  width='13'
                  height='13'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}
                  aria-hidden='true'
                >
                  <polyline points='23 4 23 10 17 10' />
                  <polyline points='1 20 1 14 7 14' />
                  <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' />
                </svg>
                重新產生連結
              </button>
            </div>
          </>
        )}
      </section>

      {/* ── Section 3: Preview ───────────────────────────────────────────────── */}
      {store && (
        <section className='store-card'>
          <div className='store-card-head'>
            <h2 className='store-card-title'>顧客看到的賣場登入頁</h2>
            <a
              href={`/store/${store.slug}/login`}
              className='store-preview-link'
              target='_blank'
              rel='noopener noreferrer'
            >
              查看完整頁面
              <svg
                viewBox='0 0 24 24'
                width='13'
                height='13'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <line x1='7' y1='17' x2='17' y2='7' />
                <polyline points='7 7 17 7 17 17' />
              </svg>
            </a>
          </div>
          <div className='store-preview-wrap'>
            <div className='store-preview-card'>
              <div className='store-preview-mini-logo'>
                {store.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.avatar_url}
                    alt={store.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  store.name.slice(0, 1)
                )}
              </div>
              <div className='store-preview-name'>{store.name}</div>
              {store.description && <div className='store-preview-desc'>{store.description}</div>}
              <div className='store-preview-line-btn'>
                <svg viewBox='0 0 48 48' width='14' height='14' fill='none' aria-hidden='true'>
                  <rect width='48' height='48' rx='10' fill='rgba(255,255,255,.25)' />
                  <path
                    d='M24 10C15.16 10 8 15.82 8 22.9C8 29.24 13.46 34.58 21.06 35.74C21.58 35.84 22.3 36.06 22.48 36.5C22.64 36.9 22.58 37.52 22.52 37.92L22.24 39.58C22.16 39.98 21.88 41.12 24 40.24C26.12 39.36 35.28 33.72 39.06 29.36C41.62 26.56 43 24 43 22.9C43 15.82 35.84 10 27 10H24Z'
                    fill='white'
                  />
                </svg>
                使用 LINE 登入
              </div>
            </div>
            <span className='store-preview-caption'>↑ 縮小預覽 · 實際畫面更精緻</span>
          </div>
        </section>
      )}

      {/* ── Regenerate confirmation modal ────────────────────────────────────── */}
      {showRegenModal && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='regen-modal-title'
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(28,54,16,.4)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRegenModal(false)
          }}
        >
          <div className='store-modal'>
            <h3 id='regen-modal-title' className='store-modal-title'>
              重新產生邀請連結
            </h3>
            <p className='store-modal-body'>
              舊連結將立即失效，使用舊連結的顧客將需要重新點擊新連結。確定重新產生？
            </p>
            <div className='store-modal-actions'>
              <button
                type='button'
                className='store-btn store-btn-ghost'
                onClick={() => setShowRegenModal(false)}
              >
                取消
              </button>
              <button
                type='button'
                className='store-btn store-btn-danger'
                onClick={handleRegenToken}
              >
                確定重新產生
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role='status'
          aria-live='polite'
          className={`store-toast ${toast.type === 'success' ? 'store-toast-success' : 'store-toast-error'}`}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        .store-card {
          background: #fff;
          border: 1px solid var(--neutral-200);
          border-radius: var(--r-lg);
          padding: 26px 28px;
          margin-bottom: 22px;
          box-shadow: var(--sh-xs);
        }
        .store-card-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 18px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .store-card-title {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 17px;
          font-weight: 500;
          color: var(--neutral-800);
          letter-spacing: .04em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .store-card-title::before {
          content: '';
          width: 4px; height: 16px;
          background: var(--sage-500, #508a2c);
          border-radius: 4px;
          display: inline-block;
        }
        .store-card-hint {
          font-size: 12.5px;
          color: var(--neutral-500);
        }
        .store-info-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 32px;
          align-items: flex-start;
        }
        .store-avatar-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .store-avatar {
          position: relative;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: var(--sage-600, #3d7020);
          background-image: radial-gradient(ellipse 60% 60% at 30% 30%, rgba(109,171,61,.5) 0%, transparent 65%), radial-gradient(ellipse 60% 60% at 70% 80%, rgba(28,54,16,.4) 0%, transparent 60%);
          display: grid;
          place-items: center;
          color: #fff;
          cursor: pointer;
          box-shadow: var(--sh-sm, 0 2px 8px rgba(28,54,16,.09)), inset 0 0 0 4px rgba(255,255,255,.12);
          overflow: hidden;
          border: none;
          transition: transform .25s;
          padding: 0;
        }
        .store-avatar:hover:not(:disabled) { transform: scale(1.03); }
        .store-avatar:disabled { opacity: .6; cursor: not-allowed; }
        .store-avatar-initial {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 42px;
          font-weight: 700;
          line-height: 1;
          user-select: none;
        }
        .store-avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(28,54,16,.65);
          color: #fff;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          opacity: 0;
          transition: opacity .2s;
          border-radius: 50%;
        }
        .store-avatar:hover:not(:disabled) .store-avatar-overlay { opacity: 1; }
        .store-avatar-loading {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(28,54,16,.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .store-avatar-loading::after {
          content: '';
          width: 24px; height: 24px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        .store-avatar-cap {
          font-size: 11.5px;
          color: var(--neutral-500);
          text-align: center;
          line-height: 1.5;
        }
        .store-form { display: flex; flex-direction: column; }
        .store-form-row { margin-bottom: 18px; }
        .store-form-row:last-of-type { margin-bottom: 0; }
        .store-form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--neutral-700);
          margin-bottom: 6px;
          letter-spacing: .03em;
        }
        .store-form-req { color: var(--sakura, #e8749d); margin-left: 2px; }
        .store-input, .store-textarea {
          width: 100%;
          padding: 11px 14px;
          font-family: inherit;
          font-size: 14px;
          color: var(--neutral-800);
          background: #fff;
          border: 1px solid var(--neutral-200);
          border-radius: var(--r-md);
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .store-input:hover:not(:disabled), .store-textarea:hover:not(:disabled) { border-color: var(--neutral-300); }
        .store-input:focus, .store-textarea:focus {
          border-color: var(--sage-400, #6dab3d);
          box-shadow: 0 0 0 3px rgba(109,171,61,.15);
        }
        .store-input:disabled, .store-textarea:disabled { background: var(--neutral-50); opacity: .7; }
        .store-textarea { resize: vertical; min-height: 88px; line-height: 1.6; }
        .store-form-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 11.5px;
          color: var(--neutral-400);
        }
        .store-count { color: var(--neutral-500); }
        .store-count-error { color: var(--sakura, #e8749d); }
        .store-form-actions {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid var(--neutral-100);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .store-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--r-md);
          cursor: pointer;
          border: 1px solid transparent;
          transition: background .15s, color .15s, transform .15s, box-shadow .15s;
          text-decoration: none;
        }
        .store-btn:disabled { opacity: .55; cursor: not-allowed; transform: none !important; }
        .store-btn-primary { background: var(--sage-600, #3d7020); color: #fff; box-shadow: 0 2px 8px rgba(61,112,32,.22); }
        .store-btn-primary:hover:not(:disabled) { background: var(--sage-700, #2c5218); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(61,112,32,.3); }
        .store-btn-ghost { background: transparent; color: var(--neutral-600); border-color: var(--neutral-200); }
        .store-btn-ghost:hover:not(:disabled) { background: var(--neutral-100); color: var(--neutral-800); }
        .store-btn-danger { background: #c0392b; color: #fff; }
        .store-btn-danger:hover:not(:disabled) { background: #a93226; transform: translateY(-1px); }
        .store-btn-spinner {
          display: inline-block;
          width: 12px; height: 12px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        .store-btn-warning {
          background: none;
          color: var(--color-warning, #c4a828);
          font-size: 12.5px;
          padding: 6px 0;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: color .15s;
        }
        .store-btn-warning:hover:not(:disabled) { color: #8a7416; text-decoration: underline; }
        .store-btn-warning:disabled { opacity: .5; cursor: not-allowed; }
        .store-invite-empty { font-size: 13px; color: var(--neutral-400); font-style: italic; }
        .store-invite-row {
          display: flex;
          gap: 10px;
          align-items: stretch;
          margin-bottom: 14px;
        }
        .store-invite-link {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--sage-50, #f2f8ec);
          border: 1px dashed var(--sage-200, #b8dca0);
          border-radius: var(--r-md);
          font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
          font-size: 13px;
          color: var(--sage-700, #2c5218);
          overflow-x: auto;
          white-space: nowrap;
        }
        .store-invite-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--neutral-100);
        }
        .store-invite-note { font-size: 12.5px; color: var(--neutral-500); line-height: 1.7; }
        .store-preview-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .store-preview-card {
          width: 100%;
          max-width: 320px;
          background: var(--sage-700, #2c5218);
          background-image: radial-gradient(ellipse 80% 50% at 90% 10%, rgba(109,171,61,.3) 0%, transparent 60%), radial-gradient(ellipse 60% 70% at 5% 95%, rgba(28,54,16,.6) 0%, transparent 60%);
          border-radius: var(--r-lg);
          padding: 28px 24px;
          color: #fff;
          text-align: center;
          box-shadow: var(--sh-md, 0 4px 16px rgba(28,54,16,.11));
        }
        .store-preview-mini-logo {
          width: 56px; height: 56px;
          margin: 0 auto 12px;
          border-radius: 50%;
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.3);
          display: grid;
          place-items: center;
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 22px;
          font-weight: 700;
          overflow: hidden;
        }
        .store-preview-name {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: .1em;
          margin-bottom: 6px;
        }
        .store-preview-desc {
          font-size: 11.5px;
          color: rgba(255,255,255,.6);
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .store-preview-line-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #00b900;
          color: #fff;
          padding: 8px 18px;
          border-radius: var(--r-full);
          font-size: 12.5px;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(0,185,0,.3);
        }
        .store-preview-link {
          font-size: 12.5px;
          color: var(--sage-600, #3d7020);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .store-preview-link:hover { text-decoration: underline; }
        .store-preview-caption {
          font-size: 11.5px;
          color: var(--neutral-400);
        }
        .store-modal {
          background: #fff;
          border-radius: var(--r-lg);
          padding: 28px 28px 22px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 8px 40px rgba(28,54,16,.18);
        }
        .store-modal-title {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 17px;
          font-weight: 500;
          color: var(--neutral-800);
          margin-bottom: 12px;
        }
        .store-modal-body {
          font-size: 14px;
          color: var(--neutral-600);
          line-height: 1.65;
          margin-bottom: 22px;
        }
        .store-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .store-toast {
          position: fixed;
          bottom: 30px; left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: var(--r-full);
          font-size: 13px;
          font-weight: 500;
          z-index: 300;
          box-shadow: var(--sh-md, 0 4px 16px rgba(28,54,16,.11));
          animation: toastIn .25s ease-out;
        }
        .store-toast-success { background: var(--sage-700, #2c5218); color: #fff; }
        .store-toast-error { background: #c0392b; color: #fff; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 768px) {
          .store-info-grid { grid-template-columns: 1fr; gap: 18px; }
          .store-avatar-wrap { align-items: flex-start; }
          .store-invite-row { flex-direction: column; }
          .store-card { padding: 20px 18px; }
        }
      `}</style>
    </>
  )
}
