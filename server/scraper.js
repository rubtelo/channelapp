import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'
import { getStream, isStreamOnline, resolveChromeExecutable } from './getStream.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SECRET_KEY = process.env.API_SECRET_KEY || 'Adm1n1str4'

/**
 * Ejecuta el proceso de scraping de canales leyendo public/tvdata.json,
 * generando public/tvresult.json y sincronizando con la API externa.
 * 
 * @returns {Promise<{last_updated: string, data: Array}>}
 */
export async function runScraper() {
  let browser = null

  try {
    const dataPath = path.join(__dirname, '../public/tvdata.json')
    const raw = await readFile(dataPath, 'utf-8')
    const channels = JSON.parse(raw)

    console.log(`\n🚀 Iniciando procesamiento para ${channels.length} canal(es)...\n`)

    const finalResults = []

    for (const channel of channels) {
      // 1. Por cada elemento del array valida si el key "active": true y continuas, si es false pasas al siguiente
      if (channel.active !== true) {
        console.log(`⏭️ Saltando ${channel.title || 'Canal'} (active: false)`)
        continue
      }

      console.log(`📺 Procesando canal: ${channel.title} (ID: ${channel.id})`)
      const sources = []

      // 2. Si el key "direct" tiene elementos y los elementos internos tienen "active": true, validar si está online
      if (Array.isArray(channel.direct) && channel.direct.length > 0) {
        for (const directItem of channel.direct) {
          if (directItem.active === true && directItem.base && directItem.base.trim() !== '') {
            const streamUrl = directItem.base.trim()
            console.log(`   ⚡ [direct] Validando: ${streamUrl}`)
            const isOnline = await isStreamOnline(streamUrl)
            if (isOnline) {
              console.log(`      ✅ Direct Online!`)
              sources.push({
                link: streamUrl
              })
            } else {
              console.log(`      ❌ Direct Offline / No responde`)
            }
          }
        }
      }

      // 3. Revisar los elementos en el array "link" con "active": true usando Puppeteer
      if (Array.isArray(channel.link) && channel.link.length > 0) {
        const activeLinks = channel.link.filter(
          (l) => l.active === true && l.base && l.base.trim() !== ''
        )

        if (activeLinks.length > 0) {
          if (!browser) {
            const execPath = resolveChromeExecutable()
            if (execPath) {
              console.log(`🌐 Usando navegador del sistema: ${execPath}`)
            }
            browser = await puppeteer.launch({
              headless: true,
              executablePath: execPath,
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
              ]
            })
          }

          for (const linkItem of activeLinks) {
            const pageUrl = linkItem.base.trim()
            console.log(`   🔗 [link] Scraping con Puppeteer: ${pageUrl}`)
            const result = await getStream(pageUrl, browser)

            if (result.success && result.stream) {
              let finalStream = result.stream

              // Limpiar parámetro ip si viniera presente en la url obtenida
              try {
                const urlObj = new URL(finalStream)
                if (urlObj.searchParams.has('ip')) {
                  urlObj.searchParams.delete('ip')
                  finalStream = urlObj.toString()
                }
              } catch (_) {}

              console.log(`      ✅ M3U8 encontrado: ${finalStream.substring(0, 65)}...`)
              sources.push({
                link: finalStream
              })
            } else {
              console.log(`      ❌ Falló: ${result.message}`)
            }
          }
        }
      }

      // 4. Si las URLs que van a pasar a result son de resultado positivo
      if (sources.length > 0) {
        // Logo: valida el key logo_url, si no es vacío se coloca esa url, si es vacío el valor de logo
        let finalLogo = channel.logo
        if (
          channel.logo_url &&
          typeof channel.logo_url === 'string' &&
          channel.logo_url.trim() !== ''
        ) {
          finalLogo = channel.logo_url.trim()
        }

        finalResults.push({
          title: channel.title,
          logo: finalLogo,
          sources: sources
        })
      } else {
        console.log(`   ⚠️ Sin fuentes válidas para ${channel.title}`)
      }
    }

    // Cerramos el browser lo antes posible si se abrió
    if (browser) {
      await browser.close()
      browser = null
    }

    // Generar fecha en formato local de Bogotá (YYYY-MM-DDTHH:mm:ss)
    const bogotaDate = new Date()
      .toLocaleString('sv-SE', { timeZone: 'America/Bogota' })
      .replace(' ', 'T')

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
          'x-api-key': SECRET_KEY,
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

    return output

  } finally {
    if (browser) {
      await browser.close().catch(() => {})
      console.log('🧹 Limpieza: Navegador cerrado por precaución.')
    }
  }
}
