import { useEffect, useState } from 'react'
import { formatMoney } from '../domain/money'
import { publicAsset } from './EntityIcon'

export const banknoteStories = [
  {
    denomination: 10,
    slug: 'ten',
    name: 'Chabuca Granda',
    image: '/banknote-portraits/chabuca-granda.png',
    role: 'Cantautora y compositora peruana',
    biography: 'María Isabel Granda y Larco renovó la música criolla y llevó la sensibilidad cultural del Perú a escenarios internacionales.',
    nature: 'Vicuña y Flor de Amancaes',
  },
  {
    denomination: 20,
    slug: 'twenty',
    name: 'José María Arguedas',
    image: '/banknote-portraits/jose-maria-arguedas.png',
    role: 'Escritor y etnólogo peruano',
    biography: 'Su obra literaria y antropológica acercó el mundo andino y sus lenguas a la cultura nacional contemporánea.',
    nature: 'Cóndor y Flor de la Cantuta',
  },
  {
    denomination: 50,
    slug: 'fifty',
    name: 'María Rostworowski',
    image: '/banknote-portraits/maria-rostworowski.png',
    role: 'Historiadora e investigadora peruana',
    biography: 'Dedicó su vida a estudiar las sociedades andinas y transformó la comprensión moderna del Perú prehispánico.',
    nature: 'Jaguar y Puya Raimondi',
  },
  {
    denomination: 100,
    slug: 'one-hundred',
    name: 'Pedro Paulet',
    image: '/banknote-portraits/pedro-paulet.png',
    role: 'Ingeniero e inventor peruano',
    biography: 'Pionero de la propulsión aeroespacial, desarrolló conceptos tempranos de motores y vehículos impulsados por cohetes.',
    nature: 'Colibrí Cola de Espátula y orquídea',
  },
  {
    denomination: 200,
    slug: 'two-hundred',
    name: 'Tilsa Tsuchiya',
    image: '/banknote-portraits/tilsa-tsuchiya.png',
    role: 'Pintora y grabadora peruana',
    biography: 'Construyó un universo visual propio que fusionó mitología indígena, fantasía y técnicas artísticas europeas.',
    nature: 'Gallito de las Rocas y Flor Bella Abanquina',
  },
] as const

interface BanknoteCarouselProps {
  totalBalanceCents: number
  activeFunds: number
  incomeCents: number
  expenseCents: number
  amountsVisible: boolean
  onToggleAmounts: () => void
}

export function BanknoteCarousel({
  totalBalanceCents,
  activeFunds,
  incomeCents,
  expenseCents,
  amountsVisible,
  onToggleAmounts,
}: BanknoteCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [interactionVersion, setInteractionVersion] = useState(0)
  const active = banknoteStories[activeIndex]
  const amount = amountsVisible ? formatMoney(totalBalanceCents).replace(/^S\/\s*/, '') : '••••••'
  const displayMoney = (cents: number) => amountsVisible ? formatMoney(cents) : 'S/ ••••••'

  useEffect(() => {
    if (detailOpen) return
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % banknoteStories.length), 8_000)
    return () => window.clearInterval(timer)
  }, [detailOpen, interactionVersion])

  useEffect(() => {
    if (!detailOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [detailOpen])

  const selectStory = (index: number) => {
    setActiveIndex(index)
    setInteractionVersion((version) => version + 1)
  }
  const showPrevious = () => selectStory((activeIndex - 1 + banknoteStories.length) % banknoteStories.length)
  const showNext = () => selectStory((activeIndex + 1) % banknoteStories.length)

  return <>
    <section className={`balance-card banknote-theme banknote-${active.slug}`} aria-label={`Saldo disponible, homenaje del billete de ${active.denomination} soles`}>
      <div className="wealth-heading">
        <span>Dinero disponible total</span>
        <button type="button" aria-label={amountsVisible ? 'Ocultar montos' : 'Mostrar montos'} onClick={onToggleAmounts}>
          <span className={`eye-symbol ${amountsVisible ? '' : 'closed'}`} aria-hidden="true" />
        </button>
      </div>
      <button className="banknote-person" type="button" aria-label={`Conocer a ${active.name}, personaje del billete de ${active.denomination} soles`} onClick={() => setDetailOpen(true)}>
        <img src={publicAsset(active.image)} alt="" />
        <span>S/ {active.denomination} · {active.name}</span>
      </button>
      <strong className="balance-amount"><span className="balance-currency">S/</span><span>{amount}</span></strong>
      <small>{activeFunds} {activeFunds === 1 ? 'fondo activo' : 'fondos activos'}</small>
      <div className="banknote-dots" aria-label={`Personaje ${activeIndex + 1} de ${banknoteStories.length}`}>
        {banknoteStories.map((story, index) => <button
          key={story.denomination}
          type="button"
          className={index === activeIndex ? 'active' : ''}
          aria-label={`Mostrar billete de ${story.denomination} soles: ${story.name}`}
          aria-current={index === activeIndex ? 'true' : undefined}
          onClick={() => selectStory(index)}
        />)}
      </div>
      <div className="wealth-month"><span>Ingresos del mes <b>{displayMoney(incomeCents)}</b></span><span>Egresos del mes <b>{displayMoney(expenseCents)}</b></span></div>
    </section>

    {detailOpen && <div className="banknote-modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setDetailOpen(false) }}>
      <section className={`banknote-story banknote-${active.slug}`} role="dialog" aria-modal="true" aria-label={`Historia del billete de ${active.denomination} soles`}>
        <div className="banknote-story-header">
          <div><span>NUEVA FAMILIA DE BILLETES</span><h2>S/ {active.denomination} · {active.name}</h2></div>
          <button type="button" aria-label="Cerrar historia" onClick={() => setDetailOpen(false)}>×</button>
        </div>
        <div className="banknote-story-portrait"><img src={publicAsset(active.image)} alt={`Retrato editorial de ${active.name}`} /></div>
        <div className="banknote-story-copy"><span>{active.role}</span><p>{active.biography}</p></div>
        <div className="banknote-story-facts">
          <article><small>REVERSO DEL BILLETE</small><b>{active.nature}</b></article>
          <article><small>SEGURIDAD</small><b>Marca de agua, hilo de seguridad y tinta con cambio de color</b></article>
        </div>
        <div className="banknote-story-nav">
          <button type="button" aria-label="Personaje anterior" onClick={showPrevious}>‹</button>
          <span>{activeIndex + 1} / {banknoteStories.length}</span>
          <button type="button" aria-label="Personaje siguiente" onClick={showNext}>›</button>
        </div>
      </section>
    </div>}
  </>
}
