'use client'

import { useState, useRef, useTransition } from 'react'
import type { Store } from '@/types'
import { ConfirmModal } from '@/components/ui/Modal'
import { ToastContainer, useToast } from '@/components/ui/Toast'

// ── 共用 class ─────────────────────────────────────────────────────────────────

const FLD =
  'w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle disabled:opacity-60 disabled:cursor-not-allowed'

interface Props {
  initialStore: Store | null
  appUrl: string
}

export default function StoreSettingsClient({ initialStore, appUrl }: Props) {
  const [store, setStore] = useState<Store | null>(initialStore)
  const [name, setName] = useState(initialStore?.name ?? '')
  const [description, setDescription] = useState(initialStore?.description ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialStore?.avatar_url ?? null
  )
  const [copyLabel, setCopyLabel] = useState('複製連結')
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(
    initialStore?.banner_image_url ?? null
  )
  const [bannerLinkUrl, setBannerLinkUrl] = useState(initialStore?.banner_link_url ?? '')
  const [isSavingBanner, setIsSavingBanner] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [isTogglingPublic, setIsTogglingPublic] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const { toasts, toast, dismiss } = useToast()

  const isLoading = isPending || isUploading

  async function handleTogglePublicProducts() {
    if (!store) return
    const next = !store.allow_public_products
    setIsTogglingPublic(true)
    try {
      const res = await fetch(`/api/store/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_public_products: next }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast(body.error || '更新失敗', 'error')
        return
      }
      setStore(body.data as Store)
      toast(next ? '公開商品功能已開啟' : '公開商品功能已關閉', 'success')
    } catch {
      toast('更新失敗，請稍後再試', 'error')
    } finally {
      setIsTogglingPublic(false)
    }
  }

  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('僅支援 JPG / PNG / WebP 格式', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('圖片大小不能超過 5MB', 'error')
      return
    }
    setBannerImageFile(file)
    setBannerImagePreview(URL.createObjectURL(file))
  }

  async function handleRemoveBannerImage() {
    if (!store) return
    setIsUploadingBanner(true)
    try {
      const res = await fetch(`/api/store/${store.id}/banner`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) {
        toast(body.error || '移除失敗', 'error')
        return
      }
      setStore((prev) => (prev ? { ...prev, banner_image_url: null } : prev))
      setBannerImageFile(null)
      setBannerImagePreview(null)
      toast('橫幅圖片已移除', 'success')
    } catch {
      toast('移除失敗，請稍後再試', 'error')
    } finally {
      setIsUploadingBanner(false)
    }
  }

  async function handleSaveBanner() {
    if (!store) return
    if (bannerLinkUrl.length > 500) {
      toast('橫幅連結網址不能超過 500 個字', 'error')
      return
    }
    setIsSavingBanner(true)
    try {
      let updatedStore: Store = store

      if (bannerImageFile) {
        setIsUploadingBanner(true)
        const formData = new FormData()
        formData.append('banner', bannerImageFile, bannerImageFile.name || 'banner')
        const uploadRes = await fetch(`/api/store/${store.id}/banner`, {
          method: 'POST',
          body: formData,
        })
        const uploadBody = await uploadRes.json()
        setIsUploadingBanner(false)
        if (!uploadRes.ok) {
          toast(uploadBody.error || '橫幅圖片上傳失敗', 'error')
          return
        }
        updatedStore = { ...updatedStore, banner_image_url: uploadBody.data.banner_image_url }
        setBannerImageFile(null)
      }

      const res = await fetch(`/api/store/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner_link_url: bannerLinkUrl.trim() || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast(body.error || '更新失敗', 'error')
        return
      }
      updatedStore = { ...updatedStore, banner_link_url: body.data.banner_link_url }
      setStore(updatedStore)
      setBannerImagePreview(updatedStore.banner_image_url)
      toast('橫幅設定已更新', 'success')
    } catch {
      toast('更新失敗，請稍後再試', 'error')
    } finally {
      setIsSavingBanner(false)
    }
  }

  function handleAvatarClick() {
    if (!isLoading) fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('僅支援 JPG / PNG / WebP 格式', 'error')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function compressImage(file: File): Promise<File> {
    const { default: imageCompression } = await import('browser-image-compression')
    return imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 800, useWebWorker: true })
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
      toast('賣場名稱至少需要 2 個字', 'error')
      return
    }
    if (name.trim().length > 30) {
      toast('賣場名稱不能超過 30 個字', 'error')
      return
    }
    if (description.length > 200) {
      toast('賣場介紹不能超過 200 個字', 'error')
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
            toast(body.error || '儲存失敗', 'error')
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
            toast(body.error || '儲存失敗', 'error')
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
            toast(err instanceof Error ? err.message : '頭像上傳失敗', 'error')
          }
        }

        setStore(savedStore)
        setName(savedStore.name)
        setDescription(savedStore.description ?? '')
        setAvatarPreview(savedStore.avatar_url)
        toast('賣場資訊已更新', 'success')
      } catch {
        toast('儲存失敗，請稍後再試', 'error')
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
          toast(body.error || '重新產生失敗', 'error')
          return
        }
        setStore((prev) => (prev ? { ...prev, invite_token: body.data.invite_token } : prev))
        toast('邀請連結已更新', 'success')
      } catch {
        toast('重新產生失敗，請稍後再試', 'error')
      }
    })
  }

  const inviteLink = store ? `${appUrl}/store/${store.slug}/join` : null
  const avatarInitial = name.trim().slice(0, 1) || '芮'

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {showRegenModal && (
        <ConfirmModal
          title='重新產生邀請連結'
          message='舊連結將立即失效，使用舊連結的顧客將需要重新點擊新連結。確定重新產生？'
          confirmLabel='確定重新產生'
          onConfirm={handleRegenToken}
          onCancel={() => setShowRegenModal(false)}
          isLoading={isPending}
          danger
        />
      )}

      {/* ── Section 1: 賣場基本資訊 ───────────────────────────────────────── */}
      <section className='bg-surface border border-line rounded-xl overflow-hidden'>
        <div className='px-6 pt-5 pb-4 border-b border-line flex items-center justify-between'>
          <SectionTitle>賣場基本資訊</SectionTitle>
          <span className='text-xs text-fg-muted'>儲存後將同步至顧客端</span>
        </div>

        <div className='p-6'>
          <div className='flex gap-6 items-start'>
            {/* 頭像 */}
            <div className='flex flex-col items-center gap-2 shrink-0'>
              <button
                type='button'
                aria-label='更換頭像'
                onClick={handleAvatarClick}
                disabled={isLoading}
                className='relative w-20 h-20 rounded-pill bg-secondary text-white overflow-hidden transition hover:scale-[1.03] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 focus-visible:ring-2 focus-visible:ring-secondary'
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt='賣場頭像' className='w-full h-full object-cover' />
                ) : (
                  <span className='font-display font-bold text-4xl select-none'>
                    {avatarInitial}
                  </span>
                )}
                <div
                  className='absolute inset-0 bg-[rgba(0,0,0,0.55)] flex flex-col items-center justify-center gap-0.5 opacity-0 hover:opacity-100 transition'
                  aria-hidden='true'
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M12 20h9' />
                    <path d='M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z' />
                  </svg>
                  <span className='text-[10px] font-display font-semibold'>更換</span>
                </div>
                {isUploading && (
                  <div
                    className='absolute inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center'
                    aria-label='上傳中'
                  >
                    <svg
                      className='animate-spin'
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='white'
                      strokeWidth='2'
                    >
                      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
                    </svg>
                  </div>
                )}
              </button>
              <span className='text-[11px] text-fg-subtle text-center leading-snug'>
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

            {/* 表單 */}
            <div className='flex-1 min-w-0 space-y-4'>
              <div>
                <label
                  htmlFor='storeName'
                  className='block font-display font-semibold text-sm mb-1.5'
                >
                  賣場名稱 <span className='text-danger'>*</span>
                </label>
                <input
                  id='storeName'
                  type='text'
                  className={FLD}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  disabled={isLoading}
                  placeholder='請輸入賣場名稱'
                />
                <div className='flex items-center justify-between mt-1.5'>
                  <span className='text-xs text-fg-subtle'>顧客將看到的店家名稱</span>
                  <span
                    className={`font-mono text-[11px] ${name.length < 2 && name.length > 0 ? 'text-danger' : 'text-fg-subtle'}`}
                  >
                    {name.length} / 30
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor='storeDesc'
                  className='block font-display font-semibold text-sm mb-1.5'
                >
                  賣場介紹
                </label>
                <textarea
                  id='storeDesc'
                  className={`${FLD} resize-y min-h-[88px] leading-relaxed`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  rows={4}
                  disabled={isLoading}
                  placeholder='例：日韓代購精選，主打女裝、配件與生活雜貨。每月固定收單兩次，週三截止。'
                />
                <div className='flex items-center justify-between mt-1.5'>
                  <span className='text-xs text-fg-subtle'>
                    最多 200 字，可包含營業時間、聯絡方式
                  </span>
                  <span
                    className={`font-mono text-[11px] ${description.length > 200 ? 'text-danger' : 'text-fg-subtle'}`}
                  >
                    {description.length} / 200
                  </span>
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-4 border-t border-line'>
                <button
                  type='button'
                  onClick={handleReset}
                  disabled={isLoading}
                  className='inline-flex items-center gap-1.5 h-9 px-4 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  取消變更
                </button>
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={isLoading}
                  className='inline-flex items-center gap-1.5 h-9 px-5 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv active:scale-[.97] transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoading ? (
                    <>
                      <svg
                        className='animate-spin'
                        width='13'
                        height='13'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        aria-hidden='true'
                      >
                        <path d='M21 12a9 9 0 1 1-6.219-8.56' />
                      </svg>
                      儲存中…
                    </>
                  ) : (
                    <>
                      <svg
                        width='13'
                        height='13'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.2'
                        strokeLinecap='round'
                        aria-hidden='true'
                      >
                        <polyline points='20 6 9 17 4 12' />
                      </svg>
                      儲存變更
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 1.5: 首頁橫幅設定 ───────────────────────────────────── */}
      {store && (
        <section className='bg-surface border border-line rounded-xl overflow-hidden'>
          <div className='px-6 pt-5 pb-4 border-b border-line flex items-center justify-between'>
            <SectionTitle>首頁橫幅設定</SectionTitle>
            <span className='text-xs text-fg-muted'>顯示在賣場首頁頂部的大型橫幅</span>
          </div>

          <div className='p-6 space-y-4'>
            <p className='text-sm text-fg-muted leading-relaxed'>
              上傳顧客進入賣場時看到的橫幅圖片，可選填點擊後前往的連結。未上傳圖片時顯示系統預設版面。
            </p>

            <div>
              <span className='block font-display font-semibold text-sm mb-1.5'>橫幅圖片</span>
              {bannerImagePreview ? (
                <div className='relative rounded-xl overflow-hidden group'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerImagePreview}
                    alt='橫幅圖片預覽'
                    className='w-full h-44 object-cover'
                  />
                  <div className='absolute inset-0 bg-[rgba(0,0,0,0.35)] opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2'>
                    <button
                      type='button'
                      onClick={() => bannerFileInputRef.current?.click()}
                      disabled={isSavingBanner || isUploadingBanner}
                      className='inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill bg-white text-fg font-display font-semibold text-xs shadow-sm disabled:opacity-50'
                    >
                      更換圖片
                    </button>
                    <button
                      type='button'
                      onClick={handleRemoveBannerImage}
                      disabled={isSavingBanner || isUploadingBanner}
                      className='inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill bg-white text-danger font-display font-semibold text-xs shadow-sm disabled:opacity-50'
                    >
                      移除圖片
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type='button'
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={isSavingBanner || isUploadingBanner}
                  className='w-full h-44 rounded-xl border-2 border-dashed border-line hover:border-secondary hover:bg-sunken transition flex flex-col items-center justify-center gap-2 text-fg-muted disabled:opacity-60 disabled:cursor-not-allowed'
                >
                  <svg
                    width='28'
                    height='28'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.6'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    aria-hidden='true'
                  >
                    <rect x='3' y='3' width='18' height='18' rx='3' />
                    <circle cx='9' cy='9' r='1.6' />
                    <path d='M21 15l-5-5L5 21' />
                  </svg>
                  <span className='font-display font-semibold text-sm'>點擊上傳橫幅圖片</span>
                  <span className='text-xs text-fg-subtle'>
                    JPG / PNG / WebP，建議 1200×400px，檔案 ≤ 5MB
                  </span>
                </button>
              )}
              <input
                ref={bannerFileInputRef}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                className='hidden'
                onChange={handleBannerFileChange}
                aria-label='上傳橫幅圖片'
              />
            </div>

            <div>
              <label
                htmlFor='bannerLinkUrl'
                className='block font-display font-semibold text-sm mb-1.5'
              >
                點擊連結（選填）
              </label>
              <input
                id='bannerLinkUrl'
                type='text'
                className={FLD}
                value={bannerLinkUrl}
                onChange={(e) => setBannerLinkUrl(e.target.value)}
                maxLength={500}
                disabled={isSavingBanner}
                placeholder='https://example.com 或 /store/slug/...'
              />
              <div className='flex items-center justify-between mt-1.5'>
                <span className='text-xs text-fg-subtle'>
                  留空則橫幅不可點擊，可填站內路徑或站外網址
                </span>
                <span
                  className={`font-mono text-[11px] ${bannerLinkUrl.length > 500 ? 'text-danger' : 'text-fg-subtle'}`}
                >
                  {bannerLinkUrl.length} / 500
                </span>
              </div>
            </div>

            <div className='flex justify-end pt-4 border-t border-line'>
              <button
                type='button'
                onClick={handleSaveBanner}
                disabled={isSavingBanner}
                className='inline-flex items-center gap-1.5 h-9 px-5 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv active:scale-[.97] transition disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isSavingBanner ? (
                  <>
                    <svg
                      className='animate-spin'
                      width='13'
                      height='13'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      aria-hidden='true'
                    >
                      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
                    </svg>
                    儲存中…
                  </>
                ) : (
                  <>
                    <svg
                      width='13'
                      height='13'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.2'
                      strokeLinecap='round'
                      aria-hidden='true'
                    >
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                    儲存橫幅設定
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 2: 顧客邀請連結 ─────────────────────────────────────── */}
      <section className='bg-surface border border-line rounded-xl overflow-hidden'>
        <div className='px-6 pt-5 pb-4 border-b border-line flex items-center justify-between'>
          <SectionTitle>顧客邀請連結</SectionTitle>
          <span className='text-xs text-fg-muted'>透過此連結邀請顧客加入</span>
        </div>

        <div className='p-6'>
          {!store ? (
            <p className='text-sm text-fg-subtle italic'>
              請先儲存賣場基本資訊，系統將自動產生邀請連結。
            </p>
          ) : (
            <div className='space-y-4'>
              <p className='text-sm text-fg-muted leading-relaxed'>
                將以下連結分享給顧客，顧客點擊後可申請加入賣場。商家審核通過後，顧客即可瀏覽商品與下單。
              </p>
              <div className='flex items-stretch gap-2'>
                <div className='flex-1 flex items-center gap-2 px-4 py-2.5 bg-sunken border border-line rounded-lg font-mono text-sm text-fg overflow-x-auto whitespace-nowrap'>
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    className='shrink-0 text-fg-muted'
                    aria-hidden='true'
                  >
                    <path d='M10 13a5 5 0 007.07 0l3-3a5 5 0 10-7.07-7.07l-1 1' />
                    <path d='M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 107.07 7.07l1-1' />
                  </svg>
                  {inviteLink}
                </div>
                <button
                  type='button'
                  onClick={handleCopyLink}
                  disabled={isLoading}
                  className='inline-flex items-center gap-1.5 h-10 px-4 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv transition disabled:opacity-50 shrink-0'
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
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
              <div className='flex items-center justify-between pt-3 border-t border-line'>
                <span className='text-xs text-fg-subtle'>舊連結點擊後將顯示「此連結已失效」。</span>
                <button
                  type='button'
                  onClick={() => setShowRegenModal(true)}
                  disabled={isLoading}
                  className='inline-flex items-center gap-1 text-sm text-warning font-display font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <polyline points='23 4 23 10 17 10' />
                    <polyline points='1 20 1 14 7 14' />
                    <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' />
                  </svg>
                  重新產生連結
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 3: 顧客看到的賣場登入頁預覽 ────────────────────────── */}
      {store && (
        <section className='bg-surface border border-line rounded-xl overflow-hidden'>
          <div className='px-6 pt-5 pb-4 border-b border-line flex items-center justify-between'>
            <SectionTitle>顧客看到的賣場登入頁</SectionTitle>
            <a
              href={`/store/${store.slug}/login`}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs text-primary hover:underline font-display font-semibold'
            >
              查看完整頁面
              <svg
                width='11'
                height='11'
                viewBox='0 0 24 24'
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
          <div className='p-6 flex flex-col items-center gap-3'>
            {/* 預覽卡 */}
            <div
              className='w-full max-w-[300px] rounded-xl p-7 text-center text-white'
              style={{
                background:
                  'radial-gradient(ellipse 80% 50% at 90% 10%, rgba(109,171,61,0.3) 0%, transparent 60%), radial-gradient(ellipse 60% 70% at 5% 95%, rgba(28,54,16,0.6) 0%, transparent 60%), var(--c-secondary-hv, #2c5218)',
                boxShadow: '0 4px 24px rgba(28,54,16,0.18)',
              }}
            >
              <div className='w-14 h-14 mx-auto rounded-pill bg-white/10 border border-white/30 flex items-center justify-center font-display font-bold text-2xl overflow-hidden mb-3'>
                {store.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.avatar_url}
                    alt={store.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  store.name.slice(0, 1)
                )}
              </div>
              <div className='font-display font-bold text-lg tracking-wide mb-1.5'>
                {store.name}
              </div>
              {store.description && (
                <div className='text-[11px] text-white/60 leading-relaxed mb-4'>
                  {store.description}
                </div>
              )}
              <div className='inline-flex items-center gap-2 bg-[#00b900] text-white px-4 py-2 rounded-pill font-display font-bold text-xs shadow-[0_3px_10px_rgba(0,185,0,0.3)]'>
                <svg viewBox='0 0 48 48' width='13' height='13' fill='none' aria-hidden='true'>
                  <rect width='48' height='48' rx='10' fill='rgba(255,255,255,.25)' />
                  <path
                    d='M24 10C15.16 10 8 15.82 8 22.9C8 29.24 13.46 34.58 21.06 35.74C21.58 35.84 22.3 36.06 22.48 36.5C22.64 36.9 22.58 37.52 22.52 37.92L22.24 39.58C22.16 39.98 21.88 41.12 24 40.24C26.12 39.36 35.28 33.72 39.06 29.36C41.62 26.56 43 24 43 22.9C43 15.82 35.84 10 27 10H24Z'
                    fill='white'
                  />
                </svg>
                使用 LINE 登入
              </div>
            </div>
            <span className='text-[11px] text-fg-subtle'>↑ 縮小預覽 · 實際畫面更精緻</span>
          </div>
        </section>
      )}

      {/* ── Section 4: 公開商品功能 ─────────────────────────────────────── */}
      {store && (
        <section className='bg-surface border border-line rounded-xl overflow-hidden'>
          <div className='px-6 pt-5 pb-4 border-b border-line'>
            <SectionTitle>公開商品功能</SectionTitle>
          </div>
          <div className='px-6 py-5'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex-1'>
                <p className='text-sm text-fg-muted leading-relaxed max-w-120'>
                  開啟後，設為公開的商品可被 Google 等搜尋引擎索引，陌生客可透過搜尋找到賣場。
                </p>
                {store.allow_public_products && (
                  <div className='mt-2 flex items-center gap-1.5'>
                    <span className='text-xs text-fg-muted'>公開商品頁：</span>
                    <a
                      href={`/p/${store.slug}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-mono text-xs text-primary hover:underline'
                    >
                      /p/{store.slug}
                    </a>
                  </div>
                )}
              </div>
              {/* Toggle switch */}
              <button
                type='button'
                role='switch'
                aria-checked={store.allow_public_products}
                aria-label='開關公開商品功能'
                disabled={isTogglingPublic}
                onClick={handleTogglePublicProducts}
                className={[
                  'relative shrink-0 w-11 h-6 rounded-pill transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-secondary',
                  store.allow_public_products ? 'bg-secondary' : 'bg-ink-300',
                  isTogglingPublic ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-pill shadow transition-transform duration-200',
                    store.allow_public_products ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='font-display font-bold text-base flex items-center gap-2.5'>
      <span className='w-1 h-5 rounded-pill bg-secondary shrink-0' aria-hidden='true' />
      {children}
    </h2>
  )
}
