import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewsPage } from './NewsPage'

const feed = {
  updatedAt: '2026-11-07T12:00:00.000Z',
  categories: {
    economy: [{ id: 'economy-1', title: 'Economía peruana', summary: 'Resumen.', source: 'Gestión', url: 'https://gestion.pe/economia/', publishedAt: '2026-11-07T10:00:00.000Z', language: 'es' }],
    science: [{ id: 'science-1', title: 'A new discovery', summary: 'An intermediate English summary.', source: 'NASA', url: 'https://www.nasa.gov/', publishedAt: '2026-11-06T10:00:00.000Z', language: 'en' }],
    civil: [],
    civilgeeks: [{ id: 'civilgeeks-1', title: 'Diseño de drenaje pluvial', summary: 'Guía técnica.', source: 'CivilGeeks', url: 'https://civilgeeks.com/diseno-drenaje-pluvial/', imageUrl: 'https://civilgeeks.com/wp-content/uploads/2025/08/drenaje.jpg', publishedAt: '2025-08-19T10:00:00.000Z', language: 'es' }],
    nobel: [], ai: [], spreadsheets: [],
    blog_sc: [{ id: 'blog-1', title: 'Lección 1', summary: 'Primera publicación.', source: 'Soltera Codiciada', url: 'https://solteracodiciada.com/2012/01/05/leccion-1-simplemente-no-le-gustas/', publishedAt: '2012-01-05T18:46:16.000Z', language: 'es' }],
  },
}

describe('portada editorial', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('alterna categorías y abre cada titular en su fuente original', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => feed }))
    render(<NewsPage />)

    const economy = await screen.findByRole('link', { name: /Economía peruana/ })
    expect(economy).toHaveAttribute('href', 'https://gestion.pe/economia/')
    expect(economy).toHaveAttribute('target', '_blank')

    fireEvent.click(screen.getByRole('button', { name: 'Science' }))
    expect(screen.getByRole('heading', { name: 'Science and discoveries' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /A new discovery/ })).toHaveAttribute('href', 'https://www.nasa.gov/')
    await waitFor(() => expect(screen.queryByRole('link', { name: /Economía peruana/ })).not.toBeInTheDocument())

    const categoryButtons = screen.getAllByRole('button').map((btn) => btn.textContent)
    const civilIndex = categoryButtons.indexOf('Ing. civil')
    const civilGeeksIndex = categoryButtons.indexOf('CivilGeeks')
    expect(civilGeeksIndex).toBe(civilIndex + 1)

    fireEvent.click(screen.getByRole('button', { name: 'CivilGeeks' }))
    expect(screen.getByText('DRENAJE Y SANEAMIENTO')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Biblioteca práctica de drenaje' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Diseño de drenaje pluvial/ })).toHaveAttribute('href', 'https://civilgeeks.com/diseno-drenaje-pluvial/')
    expect(document.querySelector('.news-card-image')).toHaveAttribute('src', 'https://civilgeeks.com/wp-content/uploads/2025/08/drenaje.jpg')

    fireEvent.click(screen.getByRole('button', { name: 'BLOG SC' }))
    expect(screen.getByRole('heading', { name: 'Las lecciones de Soltera Codiciada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lección 1/ })).toHaveAttribute('href', 'https://solteracodiciada.com/2012/01/05/leccion-1-simplemente-no-le-gustas/')
  })

  it('conserva la portada local y solo consulta novedades al deslizar hacia abajo', async () => {
    const cached = { ...feed, updatedAt: '2026-11-01T12:00:00.000Z' }
    const updated = {
      ...feed,
      updatedAt: '2026-11-08T12:00:00.000Z',
      categories: { ...feed.categories, economy: [{ ...feed.categories.economy[0], id: 'economy-2', title: 'Nuevo titular económico' }] },
    }
    localStorage.setItem('leo-financiero-news-feed-v3', JSON.stringify(cached))
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => updated })
    vi.stubGlobal('fetch', fetchMock)
    render(<NewsPage />)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Economía peruana/ })).toBeInTheDocument()

    const page = screen.getByTestId('news-page')
    fireEvent.touchStart(page, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(page, { touches: [{ clientY: 100 }] })
    fireEvent.touchEnd(page)

    expect(await screen.findByRole('link', { name: /Nuevo titular económico/ })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Portada actualizada')).toBeInTheDocument()
  })
})
