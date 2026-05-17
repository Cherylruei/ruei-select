'use client'

import { useState, useRef, useTransition } from 'react'
import type { Store } from '@/types'
import styles from './store-settings.module.css'

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
    const link = `${appUrl}/store/${store.slug}/join`
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

  const inviteLink = store ? `${appUrl}/store/${store.slug}/join` : null
  const avatarInitial = name.trim().slice(0, 1) || '芮'

  return (
    <>
      {/* ── Section 1: Store basic info ─────────────────────────────────────── */}
      <section className={styles.storeCard}>
        <div className={styles.storeCardHead}>
          <h2 className={styles.storeCardTitle}>賣場基本資訊</h2>
          <span className={styles.storeCardHint}>儲存後將同步至顧客端</span>
        </div>

        <div className={styles.storeInfoGrid}>
          {/* Avatar */}
          <div className={styles.storeAvatarWrap}>
            <button
              type='button'
              aria-label='更換頭像'
              className={styles.storeAvatar}
              onClick={handleAvatarClick}
              disabled={isLoading}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt='賣場頭像'
                  className='w-full h-full object-cover rounded-full'
                />
              ) : (
                <span className={styles.storeAvatarInitial}>{avatarInitial}</span>
              )}
              <div className={styles.storeAvatarOverlay} aria-hidden='true'>
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
              {isUploading && <div className={styles.storeAvatarLoading} aria-label='上傳中' />}
            </button>
            <span className={styles.storeAvatarCap}>
              建議 400×400px
              <br />
              JPG / PNG
            </span>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              className='hidden'
              onChange={handleFileChange}
              aria-label='上傳頭像'
            />
          </div>

          {/* Form */}
          <div className={styles.storeForm}>
            <div className={styles.storeFormRow}>
              <label htmlFor='storeName' className={styles.storeFormLabel}>
                賣場名稱<span className={styles.storeFormReq}>*</span>
              </label>
              <input
                id='storeName'
                type='text'
                className={styles.storeInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                disabled={isLoading}
                placeholder='請輸入賣場名稱'
              />
              <div className={styles.storeFormMeta}>
                <span>顧客將看到的店家名稱</span>
                <span
                  className={
                    name.length < 2 && name.length > 0 ? styles.storeCountError : styles.storeCount
                  }
                >
                  {name.length} / 30
                </span>
              </div>
            </div>

            <div className={styles.storeFormRow}>
              <label htmlFor='storeDesc' className={styles.storeFormLabel}>
                賣場介紹
              </label>
              <textarea
                id='storeDesc'
                className={styles.storeTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={4}
                disabled={isLoading}
                placeholder='例：日韓代購精選，主打女裝、配件與生活雜貨。每月固定收單兩次，週三截止。'
              />
              <div className={styles.storeFormMeta}>
                <span>最多 200 字，可包含營業時間、聯絡方式</span>
                <span
                  className={description.length > 200 ? styles.storeCountError : styles.storeCount}
                >
                  {description.length} / 200
                </span>
              </div>
            </div>

            <div className={styles.storeFormActions}>
              <button
                type='button'
                className={`${styles.storeBtn} ${styles.storeBtnGhost}`}
                onClick={handleReset}
                disabled={isLoading}
              >
                取消變更
              </button>
              <button
                type='button'
                className={`${styles.storeBtn} ${styles.storeBtnPrimary}`}
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className={styles.storeBtnSpinner} aria-hidden='true' />
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
      <section className={styles.storeCard}>
        <div className={styles.storeCardHead}>
          <h2 className={styles.storeCardTitle}>顧客邀請連結</h2>
          <span className={styles.storeCardHint}>透過此連結邀請顧客加入</span>
        </div>

        {!store ? (
          <p className={styles.storeInviteEmpty}>請先儲存賣場基本資訊，系統將自動產生邀請連結。</p>
        ) : (
          <>
            <p className={`${styles.storeInviteNote} mb-3.5`}>
              將以下連結分享給顧客，顧客點擊後可申請加入賣場。商家審核通過後，顧客即可瀏覽商品與下單。
            </p>
            <div className={styles.storeInviteRow}>
              <div className={styles.storeInviteLink}>
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
                className={`${styles.storeBtn} ${styles.storeBtnPrimary}`}
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
            <div className={styles.storeInviteFooter}>
              <span className={styles.storeInviteNote}>舊連結點擊後將顯示「此連結已失效」。</span>
              <button
                type='button'
                className={styles.storeBtnWarning}
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
                  className='inline-block align-middle mr-1'
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
        <section className={styles.storeCard}>
          <div className={styles.storeCardHead}>
            <h2 className={styles.storeCardTitle}>顧客看到的賣場登入頁</h2>
            <a
              href={`/store/${store.slug}/login`}
              className={styles.storePreviewLink}
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
          <div className={styles.storePreviewWrap}>
            <div className={styles.storePreviewCard}>
              <div className={styles.storePreviewMiniLogo}>
                {store.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.avatar_url}
                    alt={store.name}
                    className='w-full h-full object-cover rounded-full'
                  />
                ) : (
                  store.name.slice(0, 1)
                )}
              </div>
              <div className={styles.storePreviewName}>{store.name}</div>
              {store.description && (
                <div className={styles.storePreviewDesc}>{store.description}</div>
              )}
              <div className={styles.storePreviewLineBtn}>
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
            <span className={styles.storePreviewCaption}>↑ 縮小預覽 · 實際畫面更精緻</span>
          </div>
        </section>
      )}

      {/* ── Regenerate confirmation modal ────────────────────────────────────── */}
      {showRegenModal && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='regen-modal-title'
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRegenModal(false)
          }}
        >
          <div className={styles.storeModal}>
            <h3 id='regen-modal-title' className={styles.storeModalTitle}>
              重新產生邀請連結
            </h3>
            <p className={styles.storeModalBody}>
              舊連結將立即失效，使用舊連結的顧客將需要重新點擊新連結。確定重新產生？
            </p>
            <div className={styles.storeModalActions}>
              <button
                type='button'
                className={`${styles.storeBtn} ${styles.storeBtnGhost}`}
                onClick={() => setShowRegenModal(false)}
              >
                取消
              </button>
              <button
                type='button'
                className={`${styles.storeBtn} ${styles.storeBtnDanger}`}
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
          className={`${styles.storeToast} ${toast.type === 'success' ? styles.storeToastSuccess : styles.storeToastError}`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
