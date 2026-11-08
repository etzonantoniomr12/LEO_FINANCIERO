import { useEffect, useState } from 'react'
import { formatMoney } from '../domain/money'
import { publicAsset } from './EntityIcon'

export const banknoteStories = [
  {
    denomination: 10,
    slug: 'ten',
    name: 'Chabuca Granda',
    image: '/banknote-portraits/chabuca-granda.png',
    lifeImage: '/banknote-stories/chabuca-granda-life.webp',
    role: 'Cantautora y compositora peruana',
    biography: [
      'María Isabel Granda y Larco nació en Cotabambas, Apurímac, en 1920. Su familia se trasladó a Lima cuando era niña y allí descubrió el canto, el teatro y una ciudad que luego convertiría en poesía.',
      'Desde 1948 desarrolló una obra que renovó el vals criollo y dialogó también con ritmos afroperuanos. Canciones como La flor de la canela, José Antonio y Fina estampa proyectaron su mirada del Perú más allá de sus fronteras.',
    ],
    lifeCaption: 'Entre la guitarra, la palabra y los paisajes de Lima construyó una nueva sensibilidad para la canción peruana.',
    milestones: [
      { year: '1920', title: 'Raíces en Apurímac', copy: 'Nació en Cotabambas y llegó a Lima con su familia en 1923.' },
      { year: '1948', title: 'La compositora', copy: 'Inició su camino creativo con el vals Lima de veras.' },
      { year: '2017', title: 'Patrimonio cultural', copy: 'Su obra musical fue declarada Patrimonio Cultural de la Nación.' },
    ],
    nature: 'Vicuña y Flor de Amancaes',
    sourceUrl: 'https://www.gob.pe/institucion/cultura/noticias/5482-declaran-patrimonio-cultural-de-la-nacion-a-la-obra-musical-de-maria-isabel-granda-y-larco',
    source: 'Ministerio de Cultura',
  },
  {
    denomination: 20,
    slug: 'twenty',
    name: 'José María Arguedas',
    image: '/banknote-portraits/jose-maria-arguedas.png',
    lifeImage: '/banknote-stories/jose-maria-arguedas-life.webp',
    role: 'Escritor y etnólogo peruano',
    biography: [
      'Nacido en Andahuaylas en 1911, José María Arguedas creció entre el castellano y el quechua. Esa experiencia hizo de su vida un puente entre mundos culturales que durante mucho tiempo fueron presentados como separados.',
      'Fue novelista, maestro, traductor y etnólogo. Registró canciones, mitos, fiestas y tradiciones andinas, mientras obras como Yawar Fiesta, Los ríos profundos y Todas las sangres exploraron la diversidad y los conflictos del Perú.',
    ],
    lifeCaption: 'La escuela, la literatura y la investigación etnológica fueron partes de un mismo esfuerzo por comprender un Perú diverso.',
    milestones: [
      { year: '1911', title: 'Infancia andina', copy: 'Nació en Andahuaylas y aprendió el quechua durante su niñez.' },
      { year: '1939', title: 'Maestro en Sicuani', copy: 'Impulsó a sus estudiantes a documentar la memoria de sus comunidades.' },
      { year: '1964', title: 'Historia y cultura', copy: 'Dirigió el Museo Nacional de Historia y fundó una revista especializada.' },
    ],
    nature: 'Cóndor y Flor de la Cantuta',
    sourceUrl: 'https://memoriaperu.bnp.gob.pe/micrositio/jose-maria-arguedas',
    source: 'Biblioteca Nacional del Perú',
  },
  {
    denomination: 50,
    slug: 'fifty',
    name: 'María Rostworowski',
    image: '/banknote-portraits/maria-rostworowski.png',
    lifeImage: '/banknote-stories/maria-rostworowski-life.webp',
    role: 'Historiadora e investigadora peruana',
    biography: [
      'María Rostworowski nació en Barranco en 1915 y recibió parte de su educación en Europa. De regreso al Perú asistió libremente a cursos universitarios y convirtió la investigación histórica en una vocación de toda la vida.',
      'Estudió el poder, la costa prehispánica, los recursos naturales y el papel de las mujeres en el mundo andino. Fue fundadora del Instituto de Estudios Peruanos y su Historia del Tahuantinsuyu se convirtió en una obra fundamental.',
    ],
    lifeCaption: 'Archivos, mapas y paisajes arqueológicos alimentaron una historia donde los pueblos indígenas recuperaron protagonismo.',
    milestones: [
      { year: '1953', title: 'Pachacútec', copy: 'Su primer gran libro recibió el Premio Nacional de Historia Inca Garcilaso.' },
      { year: '1964', title: 'Fundación del IEP', copy: 'Participó en la creación del Instituto de Estudios Peruanos.' },
      { year: '1988', title: 'Obra fundamental', copy: 'Publicó Historia del Tahuantinsuyu, su libro más conocido.' },
    ],
    nature: 'Jaguar y Puya Raimondi',
    sourceUrl: 'https://www.gob.pe/institucion/cultura/noticias/47860-el-siglo-de-mariarostworowski',
    source: 'Ministerio de Cultura',
  },
  {
    denomination: 100,
    slug: 'one-hundred',
    name: 'Pedro Paulet',
    image: '/banknote-portraits/pedro-paulet.png',
    lifeImage: '/banknote-stories/pedro-paulet-life.webp',
    role: 'Ingeniero e inventor peruano',
    biography: [
      'Pedro Paulet nació en Arequipa en 1874. Becado por el Estado peruano, viajó a Francia y se formó en arquitectura, construcción y química, combinando ciencia, dibujo técnico e imaginación industrial.',
      'Experimentó con la propulsión líquida y concibió un motor-cohete y el llamado Avión Torpedo. También fue diplomático, periodista y promotor del desarrollo tecnológico del Perú.',
    ],
    lifeCaption: 'Del laboratorio químico a los bocetos de vuelo, Paulet imaginó vehículos capaces de superar los límites de su época.',
    milestones: [
      { year: '1895', title: 'Formación en Francia', copy: 'Viajó becado y estudió ciencias aplicadas en París.' },
      { year: '1900', title: 'Motor-cohete', copy: 'Desarrolló ideas pioneras de propulsión mediante combustible líquido.' },
      { year: '1902', title: 'Avión Torpedo', copy: 'Concluyó el diseño conceptual de una nave impulsada por cohetes.' },
    ],
    nature: 'Colibrí Cola de Espátula y orquídea',
    sourceUrl: 'https://www.bnp.gob.pe/bnp-se-cumplen-150-anos-del-nacimiento-de-pedro-paulet/',
    source: 'Biblioteca Nacional del Perú',
  },
  {
    denomination: 200,
    slug: 'two-hundred',
    name: 'Tilsa Tsuchiya',
    image: '/banknote-portraits/tilsa-tsuchiya.png',
    lifeImage: '/banknote-stories/tilsa-tsuchiya-life.webp',
    role: 'Pintora y grabadora peruana',
    biography: [
      'Tilsa Tsuchiya nació en Supe en 1928, en una familia de raíces japonesas, chinas y peruanas. Comenzó sus estudios en Bellas Artes en 1947 y, tras una pausa familiar, regresó para consolidar una voz artística singular.',
      'Obtuvo la Gran Medalla de Oro en 1959 y estudió grabado e historia del arte en París. Su pintura creó seres mitológicos y paisajes interiores donde convergen memoria, naturaleza y múltiples herencias culturales.',
    ],
    lifeCaption: 'Su taller se convirtió en un territorio de criaturas, símbolos y paisajes que no pertenecían a una sola tradición.',
    milestones: [
      { year: '1947', title: 'Bellas Artes', copy: 'Inició su formación artística en la Escuela Nacional de Bellas Artes.' },
      { year: '1959', title: 'Medalla de Oro', copy: 'Recibió el máximo reconocimiento de pintura de su promoción.' },
      { year: '1960', title: 'Etapa parisina', copy: 'Estudió grabado en Bellas Artes e Historia del Arte en La Sorbona.' },
    ],
    nature: 'Gallito de las Rocas y Flor Bella Abanquina',
    sourceUrl: 'https://cdn.www.gob.pe/uploads/document/file/4482534/Cata%CC%81logo%20Mujer%20y%20la%20Propiedad%20Intelectual%202023.pdf',
    source: 'Indecopi · Catálogo cultural',
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
        <div className="banknote-story-copy"><span>{active.role}</span>{active.biography.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        <figure className="banknote-life-scene">
          <img src={publicAsset(active.lifeImage)} alt={`Escena editorial sobre la vida de ${active.name}`} />
          <figcaption>{active.lifeCaption}</figcaption>
        </figure>
        <div className="banknote-timeline" aria-label={`Momentos en la vida de ${active.name}`}>
          {active.milestones.map((milestone) => <article key={milestone.year}><b>{milestone.year}</b><div><strong>{milestone.title}</strong><p>{milestone.copy}</p></div></article>)}
        </div>
        <div className="banknote-story-facts">
          <article><small>REVERSO DEL BILLETE</small><b>{active.nature}</b></article>
          <article><small>SEGURIDAD</small><b>Marca de agua, hilo de seguridad y tinta con cambio de color</b></article>
        </div>
        <a className="banknote-source" href={active.sourceUrl} target="_blank" rel="noreferrer">Conocer más en {active.source} <span aria-hidden="true">↗</span></a>
        <div className="banknote-story-nav">
          <button type="button" aria-label="Personaje anterior" onClick={showPrevious}>‹</button>
          <span>{activeIndex + 1} / {banknoteStories.length}</span>
          <button type="button" aria-label="Personaje siguiente" onClick={showNext}>›</button>
        </div>
      </section>
    </div>}
  </>
}
