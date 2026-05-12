import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/admin'),
}))

vi.mock('../actions', () => ({
  logout: vi.fn(),
}))

import AdminShell from '../components/AdminShell'

const defaultProps = {
  displayName: 'Cheryl',
  avatarUrl: null,
  children: <div data-testid="page-content">Page Content</div>,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminShell', () => {
  it('renders children in main content area', () => {
    render(<AdminShell {...defaultProps} />)
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
  })

  it('renders sidebar with nav items', () => {
    render(<AdminShell {...defaultProps} />)
    expect(screen.getByText('賣場設定')).toBeInTheDocument()
    expect(screen.getByText('供應商管理')).toBeInTheDocument()
  })

  it('toggles sidebar collapse when toggle button clicked', () => {
    render(<AdminShell {...defaultProps} />)
    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar).toHaveAttribute('data-collapsed', 'false')

    fireEvent.click(screen.getByLabelText('收合側邊欄'))
    expect(sidebar).toHaveAttribute('data-collapsed', 'true')

    fireEvent.click(screen.getByLabelText('收合側邊欄'))
    expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  })

  it('opens mobile sidebar when hamburger is clicked', () => {
    render(<AdminShell {...defaultProps} />)
    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false')

    fireEvent.click(screen.getByLabelText('開啟選單'))
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true')
  })

  it('closes mobile sidebar when backdrop is clicked', () => {
    render(<AdminShell {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('開啟選單'))

    const backdrop = screen.getByTestId('sidebar-backdrop')
    fireEvent.click(backdrop)

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-mobile-open', 'false')
  })
})
