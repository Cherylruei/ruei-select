'use client'

import { useState, useCallback, useEffect } from 'react'

export interface AiTemplate {
  id: string
  name: string
  instruction: string
  isDefault: boolean
}

const STORAGE_KEY = 'ruei-select:ai-templates'

function loadFromStorage(): AiTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AiTemplate[]) : []
  } catch {
    return []
  }
}

function saveToStorage(templates: AiTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    // localStorage unavailable (e.g., private browsing quota)
  }
}

export function useAiTemplates() {
  const [templates, setTemplates] = useState<AiTemplate[]>([])

  useEffect(() => {
    setTemplates(loadFromStorage())
  }, [])

  const addTemplate = useCallback((name: string, instruction: string) => {
    setTemplates((prev) => {
      const next: AiTemplate[] = [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          instruction: instruction.trim(),
          isDefault: prev.length === 0,
        },
      ]
      saveToStorage(next)
      return next
    })
  }, [])

  const updateTemplate = useCallback((id: string, name: string, instruction: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, name: name.trim(), instruction: instruction.trim() } : t
      )
      saveToStorage(next)
      return next
    })
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id)
      // If the deleted template was default, set the first remaining as default
      if (next.length > 0 && !next.some((t) => t.isDefault)) {
        next[0] = { ...next[0], isDefault: true }
      }
      saveToStorage(next)
      return next
    })
  }, [])

  const setDefault = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) => ({ ...t, isDefault: t.id === id }))
      saveToStorage(next)
      return next
    })
  }, [])

  const defaultTemplate = templates.find((t) => t.isDefault) ?? null

  return { templates, defaultTemplate, addTemplate, updateTemplate, deleteTemplate, setDefault }
}
