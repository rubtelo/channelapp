import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TvUpload() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus(`Archivo seleccionado: ${e.target.files[0].name}`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setStatus('Por favor selecciona un archivo primero.')
      return
    }

    try {
      setLoading(true)
      setStatus('Leyendo archivo...')
      
      const text = await file.text()
      const jsonData = JSON.parse(text)

      setStatus('Subiendo archivo al servidor...')
      
      const response = await fetch('/api/upload-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'Adm1n1str4' // La misma que definimos en el server
        },
        body: JSON.stringify(jsonData)
      })

      const result = await response.json()

      if (result.success) {
        setStatus('✅ Archivo tvresult.json actualizado con éxito.')
        setTimeout(() => navigate('/tvlive'), 1500)
      } else {
        setStatus(`❌ Error: ${result.message}`)
      }
    } catch (err) {
      console.error(err)
      setStatus('❌ Error: El archivo no es un JSON válido o hubo un problema de red.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Volver
      </button>

      <h1>Cargar TV Result</h1>
      <p>Sube un archivo <code>tvresult.json</code> para actualizar los enlaces en vivo.</p>

      <div className="upload-box" style={{ 
        background: 'var(--surface)', 
        padding: '2rem', 
        borderRadius: '12px', 
        border: '2px dashed rgba(255,255,255,0.1)',
        width: '100%',
        maxWidth: '500px',
        marginTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        alignItems: 'center'
      }}>
        <input 
          type="file" 
          accept=".json" 
          onChange={handleFileChange}
          id="fileInput"
          style={{ display: 'none' }}
        />
        <label htmlFor="fileInput" className="nav-btn" style={{ margin: 0, cursor: 'pointer' }}>
          Seleccionar Archivo
        </label>

        {file && (
          <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
            <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}

        <button 
          className="nav-btn live-btn" 
          onClick={handleUpload}
          disabled={!file || loading}
          style={{ width: '100%', animationDelay: '0s' }}
        >
          {loading ? 'Subiendo...' : 'Actualizar tvresult.json'}
        </button>

        {status && (
          <p className={`status ${status.startsWith('❌') ? 'error' : ''}`} style={{ fontSize: '0.9rem' }}>
            {status}
          </p>
        )}
      </div>
      
      <p className="hint">
        Nota: Esto sobrescribirá el archivo <code>public/tvresult.json</code> en el servidor.
      </p>
    </div>
  )
}
