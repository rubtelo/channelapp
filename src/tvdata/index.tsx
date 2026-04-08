import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface TvSource {
  id: number
  title: string
  logo: string
  base_link: string
  second_link: string
  third_link: string
  active: boolean
}

interface StreamSource {
  id: number
  link: string
}

interface StreamResult {
  title: string
  logo: string
  sources: StreamSource[]
}

function TvData() {
  const navigate = useNavigate()
  const [shows, setShows] = useState<TvSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado del scraping
  const [scraping, setScraping] = useState(false)
  const [scrapeResults, setScrapeResults] = useState<StreamResult[] | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Cargar tvdata.json al montar
  useEffect(() => {
    fetch('/tvdata.json')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el archivo JSON')
        return res.json()
      })
      .then((data: TvSource[]) => {
        setShows(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Llamar al backend para correr Puppeteer y obtener los m3u8
  const handleScrape = async () => {
    setScraping(true)
    setScrapeResults(null)
    setScrapeError(null)
    setLastUpdated(null)

    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      const json = await res.json()

      if (!json.success) throw new Error(json.message || 'Error desconocido')
      setScrapeResults(json.data)
      setLastUpdated(json.last_updated)
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : String(err))
    } finally {
      setScraping(false)
    }
  }

  const activeShows = shows.filter((s) => s.active)

  return (
    <main className="container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Volver
      </button>

      <h1>TV Data</h1>

      {loading && <p className="status">Cargando canales...</p>}
      {error && <p className="status error">Error: {error}</p>}

      {/* Lista de canales originales (vista previa) en formato lista */}
      {!loading && !error && (
        <>
          <div className="channels-list">
            {activeShows.map((show) => (
              <div className="list-item" key={show.id}>
                <div className="channel-header">
                   <img src={show.logo} alt="logo" className="channel-logo-small" />
                   <span className="channel-name">{show.title}</span>
                </div>
                <div className="links-info-compact">
                  <p><span>🔗 Base:</span> {show.base_link}</p>
                  <p><span>🔗 Second:</span> {show.second_link}</p>
                  {show.third_link && <p><span>🔗 Third:</span> {show.third_link}</p>}
                </div>
              </div>
            ))}
          </div>

          <button
            className="nav-btn scrape-btn"
            onClick={handleScrape}
            disabled={scraping}
          >
            {scraping
              ? '⏳ Procesando todos los links... (tardará más)'
              : `🔍 Obtener M3U8 de fuentes (${activeShows.length} canal${activeShows.length !== 1 ? 'es' : ''})`}
          </button>
        </>
      )}

      {/* Resultados del scraping con la nueva estructura de LISTA */}
      {scrapeError && (
        <p className="status error">❌ {scrapeError}</p>
      )}

      {scrapeResults && (
        <div className="results-section">
          <div className="results-header">
            <h2 className="results-title">Resultados de Fuentes</h2>
            {lastUpdated && (
              <span className="last-updated-badge">
                Actualizado: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="channels-list">
            {scrapeResults.map((r, idx) => (
              <div className="list-item" key={idx}>
                <div className="channel-info">
                  <span className="channel-name">{r.title}</span>
                </div>
                <div className="sources-container">
                  {r.sources.length > 0 ? (
                    r.sources.map((s) => (
                      <div className="source-row" key={s.id}>
                        <span className="source-badge">F{s.id}</span>
                        <a
                          className="stream-link"
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.link}
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="status error small">Sin fuentes activas</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="status">
            💾 Guardado en <code>public/tvresult.json</code>
          </p>
        </div>
      )}
    </main>
  )
}

export default TvData
