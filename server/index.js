import express from 'express'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'
import fetch from 'node-fetch'
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
  let browser = null
  try {
    const dataPath = path.join(__dirname, '../public/tvdata.json')
    const raw = await readFile(dataPath, 'utf-8')
    const channels = JSON.parse(raw)

    const activeChannels = channels.filter((c) => c.active === true)
    console.log(`\n🚀 Iniciando scraping profundo para ${activeChannels.length} canal(es)...\n`)

    const finalResults = []

    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    for (const channel of activeChannels) {
      console.log(`📺 Procesando: ${channel.title}`)
      
      const linksToProcess = [
        { id: 1, type: 'base', url: channel.base_link },
        { id: 2, type: 'second', url: channel.second_link },
      ]

      const sources = []

      for (const item of linksToProcess) {
        if (item.url && item.url.trim() !== "") {
          console.log(`   🔗 [${item.type}] Scraping: ${item.url}`)
          const result = await getStream(item.url, browser)
          
          if (result.success) {
            let finalStream = result.stream

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

    // Cerramos el browser lo antes posible tras el loop
    await browser.close()
    browser = null

    // Generar fecha en formato local de Bogotá (YYYY-MM-DDTHH:mm:ss)
    const bogotaDate = new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" }).replace(" ", "T")

    const output = {
      last_updated: bogotaDate,
      data: finalResults
    }

    const outPath = path.join(__dirname, '../public/tvresult.json')
    await writeFile(outPath, JSON.stringify(output, null, 2), 'utf-8')
    console.log('\n💾 Resultados guardados localmente en public/tvresult.json')

    try {
      console.log('📡 Sincronizando con API externa...')
      const externalResponse = await fetch('https://coopava.com.co/api/save.php', {
        method: 'POST',
        headers: {
          'x-api-key': secretKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(output)
      })

      if (externalResponse.ok) {
        console.log('✅ Sincronización exitosa con el servidor remoto.')
      } else {
        const errText = await externalResponse.text()
        console.error(`⚠️ API Remota rechazó los datos: ${errText.substring(0, 100)}...`)
      }
    } catch (remoteErr) {
      console.error('❌ Error de conexión con API externa:', remoteErr.message)
    }

    res.json({ success: true, ...output })

  } catch (err) {
    console.error('❌ Error crítico en /api/scrape:', err.message)
    res.status(500).json({ success: false, message: `Error en el scraper: ${err.message}` })
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
      console.log('🧹 Limpieza: Navegador cerrado por precaución.')
    }
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
