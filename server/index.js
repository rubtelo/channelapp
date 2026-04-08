import express from 'express'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getStream } from './getStream.js'

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

app.get('/api/channels', async (req, res) => {
  const clientToken = req.headers['x-api-key']

  if (!clientToken || clientToken !== secretKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'No autorizado. Token inválido o ausente.' 
    })
  }

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
app.post('/api/scrape', async (_req, res) => {
  try {
    // Intentamos leer de la carpeta public si existe, sino de una ruta relativa
    const dataPath = path.join(__dirname, '../public/tvdata.json')
    const raw = await readFile(dataPath, 'utf-8')
    const channels = JSON.parse(raw)

    const activeChannels = channels.filter((c) => c.active === true)
    console.log(`\n🚀 Iniciando scraping profundo para ${activeChannels.length} canal(es)...\n`)

    const finalResults = []

    for (const channel of activeChannels) {
      console.log(`📺 Procesando: ${channel.title}`)
      
      // Definimos los links a procesar de este canal
      const linksToProcess = [
        { id: 1, type: 'base', url: channel.base_link },
        { id: 2, type: 'second', url: channel.second_link },
        // { id: 3, type: 'third', url: channel.third_link }
      ]

      const sources = []

      for (const item of linksToProcess) {
        if (item.url && item.url.trim() !== "") {
          console.log(`   🔗 [${item.type}] Scraping: ${item.url}`)
          const result = await getStream(item.url)
          
          if (result.success) {
            let finalStream = result.stream

            // Si es el second_link, quitamos el parámetro ?ip= de la URL si existe
            if (item.type === 'second') {
              try {
                const urlObj = new URL(finalStream)
                urlObj.searchParams.delete('ip')
                finalStream = urlObj.toString()
                console.log(`      🧹 URL Limpiada (sin ip): ${finalStream.substring(0, 50)}...`)
              } catch (e) {
                console.error("Error limpiando URL:", e)
              }
            }

            sources.push({
              id: item.id,
              link: finalStream
            })
            console.log(`      ✅ M3U8: ${finalStream.substring(0, 60)}...`)
          } else {
            console.log(`      ❌ Falló: ${result.message}`)
          }
        }
      }

      finalResults.push({
        title: channel.title,
        logo: channel.logo,
        sources: sources
      })
    }

    // Estructura final solicitada
    const output = {
      last_updated: new Date().toISOString(),
      data: finalResults
    }

    // Guardar resultados en public/tvresult.json
    const outPath = path.join(__dirname, '../public/tvresult.json')
    await writeFile(outPath, JSON.stringify(output, null, 2), 'utf-8')
    console.log('\n💾 Resultados guardados en public/tvresult.json con timestamp')

    res.json({ success: true, ...output })

  } catch (err) {
    console.error('❌ Error en /api/scrape:', err)
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
