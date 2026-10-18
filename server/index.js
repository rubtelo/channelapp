import express from 'express'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { runScraper } from './scraper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// Permitir CORS en desarrollo
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// --- CONFIGURACIÓN PARA DESPLIEGUE (RENDER/RAILWAY) ---
// 1. Servir archivos estáticos del frontend (carpeta dist)
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

/**
 * GET /api/channels
 * Retorna el contenido del archivo tvresult.json
*/

const secretKey = 'Adm1n1str4'

/**
 * Middleware para validar la API Key
 */
const validateApiKey = (req, res, next) => {
  const clientToken = req.headers['x-api-key']
  if (!clientToken || clientToken !== secretKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'No autorizado. Token inválido o ausente.' 
    })
  }
  next()
}

app.get('/api/channels', validateApiKey, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/tvresult.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    res.json({ success: true, ...data })
  } catch (err) {
    console.error('❌ Error leyendo tvresult.json:', err)
    res.status(404).json({ 
      success: false, 
      message: 'Todavía no hay canales procesados. Ejecuta el scraper primero.' 
    })
  }
})

/**
 * POST /api/scrape
 * Lee tvdata.json, llama getStream por cada canal activo
 */
app.post('/api/scrape', validateApiKey, async (_req, res) => {
  try {
    const output = await runScraper()
    res.json({ success: true, ...output })
  } catch (err) {
    console.error('❌ Error crítico en /api/scrape:', err.message)
    res.status(500).json({ success: false, message: `Error en el scraper: ${err.message}` })
  }
})

/**
 * POST /api/upload-results
 * Recibe un JSON y lo guarda en public/tvresult.json
 */
app.post('/api/upload-results', validateApiKey, async (req, res) => {
  try {
    const data = req.body
    if (!data || !data.data) {
      return res.status(400).json({ success: false, message: 'Formato de JSON inválido.' })
    }

    const outPath = path.join(__dirname, '../public/tvresult.json')
    await writeFile(outPath, JSON.stringify(data, null, 2), 'utf-8')
    console.log('\n💾 Resultados actualizados manualmente en public/tvresult.json')

    res.json({ success: true, message: 'Archivo actualizado con éxito.' })
  } catch (err) {
    console.error('❌ Error al subir archivo:', err)
    res.status(500).json({ success: false, message: String(err) })
  }
})

// 2. IMPORTANTE: Cualquier otra ruta que no sea de la API debe devolver el index.html de React.
// Usamos este middleware al final para capturar todo lo que no haya sido capturado antes.
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️  Servidor producción listo en puerto ${PORT}`)
})
