import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface StreamSource {
  id: number
  link: string
}

interface ChannelResult {
  title: string
  logo: string
  sources: StreamSource[]
}

interface TvResult {
  last_updated: string
  data: ChannelResult[]
}

function TvLive() {
  const navigate = useNavigate()
  const [result, setResult] = useState<TvResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Leemos directamente del endpoint que ya creamos en el servidor
    // Usamos el secret key para poder ver los canales
    // Consumimos directamente la API externa de Coopava
    fetch('https://coopava.com.co/api/', {
      method: 'POST',
      headers: {
        'x-api-key': 'Adm1n1str4'
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los canales activos')
        return res.json()
      })
      .then((data) => {
        setResult(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <main className="container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Volver
      </button>

      <div className="header-view">
        <h1>Tv Live 📺</h1>
        {result && (
          <p className="last-update-text">
            Actualizado el {new Date(result.last_updated).toLocaleString()}
          </p>
        )}
      </div>

      {loading && <p className="status">Sincronizando canales...</p>}
      {error && (
        <div className="status error">
           <p>❌ Error: {error}</p>
           <p className="hint">Asegúrate de haber ejecutado el scraper antes.</p>
        </div>
      )}

      {result && result.data && (
        <div className="live-list">
          {result.data.map((channel, idx) => (
            <div className="live-item" key={idx}>
              <div className="live-main">
                <div className="live-info">
                  <span className="live-name">{channel.title}</span>
                  <div className="live-sources">
                    {channel.sources.map((s) => (
                      <a 
                        key={s.id}
                        href={s.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="live-badge"
                        title={s.link}
                      >
                        OPCIÓN {s.id}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && result && result.data.length === 0 && (
         <p className="status">No hay canales procesados disponibles.</p>
      )}
    </main>
  )
}

export default TvLive
