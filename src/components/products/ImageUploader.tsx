'use client'

import { useState, useRef } from 'react'

export interface UploadedImage {
  id?: string // DB id（編輯時已存在的圖片）
  url: string
  sort_order: number
  file?: File // 尚未上傳的新圖片
}

interface Props {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  onDeleteId?: (id: string) => void
  storeId: string
  productId?: string // 有時還沒有 productId（新增時）
  disabled?: boolean
  maxImages?: number
}

export default function ImageUploader({
  images,
  onImagesChange,
  onDeleteId,
  storeId,
  productId,
  disabled,
  maxImages = 10,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  async function compressImage(file: File): Promise<File> {
    const { default: imageCompression } = await import('browser-image-compression')
    return imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    })
  }

  async function uploadFile(file: File): Promise<string> {
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append('image', compressed, compressed.name || 'product.jpg')
    if (productId) formData.append('productId', productId)
    formData.append('storeId', storeId)

    const res = await fetch('/api/products/upload-image', { method: 'POST', body: formData })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || '上傳失敗')
    return body.data.url as string
  }

  async function handleFiles(files: File[]) {
    if (images.length + files.length > maxImages) {
      setError(`最多上傳 ${maxImages} 張圖片`)
      return
    }
    setError(null)
    setUploading(true)

    try {
      const newImages: UploadedImage[] = []
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          setError('僅支援 JPG / PNG / WebP / GIF 格式')
          continue
        }
        // 先用本地 preview，等 productId 確定後再上傳；
        // 若已有 productId，直接上傳並取得 URL
        if (productId) {
          const url = await uploadFile(file)
          newImages.push({ url, sort_order: images.length + newImages.length })
        } else {
          const url = URL.createObjectURL(file)
          newImages.push({ url, sort_order: images.length + newImages.length, file })
        }
      }
      onImagesChange([...images, ...newImages])
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) void handleFiles(files)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) void handleFiles(files)
    e.target.value = ''
  }

  function handleDragSort(e: React.DragEvent, idx: number) {
    e.preventDefault()
    dragOverItem.current = idx
  }

  function handleDropSort() {
    const from = dragItem.current
    const to = dragOverItem.current
    if (from === null || to === null || from === to) return
    const reordered = [...images]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onImagesChange(reordered.map((img, i) => ({ ...img, sort_order: i })))
    dragItem.current = null
    dragOverItem.current = null
  }

  function removeImage(idx: number) {
    const img = images[idx]
    if (img.id && onDeleteId) onDeleteId(img.id)
    onImagesChange(images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, sort_order: i })))
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Drop zone */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            disabled || uploading
              ? 'border-line opacity-60 cursor-not-allowed'
              : 'border-ink-300 hover:border-secondary cursor-pointer'
          }`}
          role='button'
          tabIndex={0}
          aria-label='點擊或拖曳圖片上傳'
          onKeyDown={(e) => e.key === 'Enter' && !disabled && fileInputRef.current?.click()}
        >
          <svg
            viewBox='0 0 24 24'
            width='28'
            height='28'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            className='mx-auto mb-2 text-fg-subtle'
            aria-hidden='true'
          >
            <rect x='3' y='3' width='18' height='18' rx='2' />
            <circle cx='8.5' cy='8.5' r='1.5' />
            <polyline points='21 15 16 10 5 21' />
          </svg>
          <p className='text-sm text-fg-muted'>
            {uploading ? '上傳中…' : '點擊或拖曳圖片（最多 10 張）'}
          </p>
          <p className='text-xs text-fg-subtle mt-1'>JPG / PNG / WebP，2MB 以內</p>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp,image/gif'
            multiple
            className='hidden'
            onChange={handleInputChange}
            disabled={disabled || uploading}
          />
        </div>
      )}

      {error && <p className='text-xs text-danger'>{error}</p>}

      {/* 圖片預覽 + 排序 */}
      {images.length > 0 && (
        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2'>
          {images.map((img, idx) => (
            <div
              key={img.url}
              draggable
              onDragStart={() => {
                dragItem.current = idx
              }}
              onDragEnter={(e) => handleDragSort(e, idx)}
              onDragEnd={handleDropSort}
              onDragOver={(e) => e.preventDefault()}
              className='relative group aspect-square rounded-md overflow-hidden border border-line cursor-grab'
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`商品圖 ${idx + 1}`} className='w-full h-full object-cover' />
              {idx === 0 && (
                <span className='absolute bottom-1 left-1 text-[10px] bg-secondary text-white px-1.5 py-0.5 rounded-md'>
                  主圖
                </span>
              )}
              <button
                type='button'
                onClick={() => removeImage(idx)}
                disabled={disabled}
                className='absolute top-1 right-1 w-5 h-5 rounded-full bg-[rgba(0,0,0,0.5)] text-white text-[12px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                aria-label={`移除第 ${idx + 1} 張圖片`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
