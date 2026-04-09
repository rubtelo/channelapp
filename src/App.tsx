import { useNavigate } from 'react-router-dom'

function App() {
  const navigate = useNavigate()

  return (
    <main className="container">
      <h1>Hola Mundo</h1>
      <p>Módulo de canales.</p>
      <button
        className="nav-btn"
        onClick={() => navigate('/tvdata')}
      >
        Ver TV Data →
      </button>

      <button
        className="nav-btn live-btn"
        onClick={() => navigate('/tvlive')}
      >
        Ver TV Live →
      </button>

      <button
        className="nav-btn"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 20px rgba(217, 119, 6, 0.4)' }}
        onClick={() => navigate('/tvupload')}
      >
        Cargar JSON →
      </button>
    </main>
  )
}

export default App
