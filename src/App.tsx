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
    </main>
  )
}

export default App
