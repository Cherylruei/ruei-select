import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('../actions', () => ({
  logout: vi.fn(),
}))

import { usePathname } from 'next/navigation'
import Sidebar from '../components/Sidebar'

const defaultProps = {
  displayName: 'Cheryl',
  avatarUrl: null,
  isMobileOpen: false,
  onNavClick: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usePathname).mockReturnValue('/admin')
})

describe('Sidebar', () => {
  describe('nav items', () => {
    it('renders all main nav items', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('總覽')).toBeInTheDocument()
      expect(screen.getByText('訂單管理')).toBeInTheDocument()
      expect(screen.getByText('商品管理')).toBeInTheDocument()
      expect(screen.getByText('顧客管理')).toBeInTheDocument()
    })

    it('renders settings nav items', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('供應商')).toBeInTheDocument()
      expect(screen.getByText('賣場設定')).toBeInTheDocument()
    })

    it('marks /admin as active when pathname is /admin', () => {
      vi.mocked(usePathname).mockReturnValue('/admin')
      render(<Sidebar {...defaultProps} />)
      const link = screen.getByRole('link', { name: /總覽/ })
      expect(link).toHaveAttribute('data-active', 'true')
    })

    it('marks /admin/store as active when pathname starts with /admin/store', () => {
      vi.mocked(usePathname).mockReturnValue('/admin/store')
      render(<Sidebar {...defaultProps} />)
      const link = screen.getByRole('link', { name: /賣場設定/ })
      expect(link).toHaveAttribute('data-active', 'true')
    })

    it('does not mark /admin as active when on /admin/store', () => {
      vi.mocked(usePathname).mockReturnValue('/admin/store')
      render(<Sidebar {...defaultProps} />)
      const link = screen.getByRole('link', { name: /總覽/ })
      expect(link).toHaveAttribute('data-active', 'false')
    })
  })

  describe('user display', () => {
    it('shows user display name', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Cheryl')).toBeInTheDocument()
    })

    it('shows first char of displayName when avatarUrl is null', () => {
      render(<Sidebar {...defaultProps} displayName='芮選' />)
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('芮')
    })

    it('shows img tag when avatarUrl is provided', () => {
      render(<Sidebar {...defaultProps} avatarUrl='https://example.com/avatar.jpg' />)
      const img = screen.getByAltText('Cheryl')
      expect(img).toBeInTheDocument()
    })
  })

  describe('mobile open state', () => {
    it('sets data-mobile-open when isMobileOpen is true', () => {
      render(<Sidebar {...defaultProps} isMobileOpen={true} />)
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-mobile-open', 'true')
    })

    it('sets data-mobile-open=false by default', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-mobile-open', 'false')
    })
  })

  describe('logout', () => {
    it('renders a logout button', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByRole('button', { name: /登出/ })).toBeInTheDocument()
    })
  })

  describe('logo navigation', () => {
    it('logo header links to /admin', () => {
      render(<Sidebar {...defaultProps} />)
      const logoLink = screen.getByRole('link', { name: /芮選/ })
      expect(logoLink).toHaveAttribute('href', '/admin')
    })

    it('calls onNavClick when logo is clicked', () => {
      const onNavClick = vi.fn()
      render(<Sidebar {...defaultProps} onNavClick={onNavClick} />)
      fireEvent.click(screen.getByRole('link', { name: /芮選/ }))
      expect(onNavClick).toHaveBeenCalledOnce()
    })

    it('calls onNavClick when a nav item is clicked', () => {
      const onNavClick = vi.fn()
      render(<Sidebar {...defaultProps} onNavClick={onNavClick} />)
      fireEvent.click(screen.getByRole('link', { name: /賣場設定/ }))
      expect(onNavClick).toHaveBeenCalledOnce()
    })
  })
})
