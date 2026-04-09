import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import TvData from './tvdata/index.tsx'
import TvLive from './tvlive/index.tsx'
import TvUpload from './tvupload/index.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/tvdata" element={<TvData />} />
        <Route path="/tvlive" element={<TvLive />} />
        <Route path="/tvupload" element={<TvUpload />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
