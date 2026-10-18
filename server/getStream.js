import puppeteer from 'puppeteer'

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Valida rápidamente si una URL m3u8 directa está online y responde con un manifiesto HLS válido (#EXTM3U).
 * @param {string} m3u8Url - URL directa m3u8
 * @returns {Promise<boolean>}
 */
export async function isStreamOnline(m3u8Url) {
  try {
    const res = await fetch(m3u8Url, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT
      },
      signal: AbortSignal.timeout(6000)
    })

    if (res.ok) {
      const text = await res.text()
      return text.includes('#EXTM3U')
    }
    return false
  } catch (_) {
    return false
  }
}

/**
 * Abre la URL y escucha solicitudes de red para capturar el primer .m3u8 y sus cabeceras HTTP.
 * @param {string} url - URL de la página
 * @param {import('puppeteer').Browser} [existingBrowser] - Instancia de navegador opcional
 */
export async function getStream(url, existingBrowser = null) {
  let browser = existingBrowser
  let page = null

  try {
    if (!browser) {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      })
    }

    page = await browser.newPage()
    await page.setUserAgent(DEFAULT_USER_AGENT)

    // Optimización: Interceptar y abortar imágenes y fuentes para acelerar la detección del stream
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      if (resourceType === 'image' || resourceType === 'font') {
        req.abort().catch(() => {})
      } else {
        req.continue().catch(() => {})
      }
    })

    // Escuchamos respuestas de red buscando el primer .m3u8
    return await new Promise((resolve) => {
      let resolved = false

      // Timeout de seguridad por si la página no carga o no emite stream
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          resolve({ success: false, message: 'Timeout: No se detectó stream en 20s' })
        }
      }, 20000)

      page.on('response', (response) => {
        const responseUrl = response.url()

        if (responseUrl.includes('.m3u8') && !resolved) {
          resolved = true
          clearTimeout(timeout)

          // Extraer cabeceras reales enviadas en la petición del stream
          const req = response.request()
          const reqHeaders = req.headers() || {}

          const referer = reqHeaders['referer'] || url
          let origin = reqHeaders['origin'] || ''
          if (!origin && referer) {
            try {
              origin = new URL(referer).origin
            } catch (_) {}
          }

          const capturedHeaders = {
            'User-Agent': reqHeaders['user-agent'] || DEFAULT_USER_AGENT,
            ...(referer ? { 'Referer': referer } : {}),
            ...(origin ? { 'Origin': origin } : {})
          }

          resolve({
            success: true,
            stream: responseUrl,
            headers: capturedHeaders
          })
        }
      })

      page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
        .then(async () => {
          // Espera corta adicional si goto termina pero no hay stream aún
          await new Promise(r => setTimeout(r, 4000))
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve({ success: false, message: 'No se encontró .m3u8 tras la carga' })
          }
        })
        .catch((error) => {
          if (!resolved) {
            resolved = true
            clearTimeout(timeout)
            resolve({ success: false, message: String(error) })
          }
        })
    })

  } catch (error) {
    return { success: false, message: String(error) }
  } finally {
    if (page) await page.close().catch(() => {})
    // Solo cerramos el browser si nosotros lo creamos
    if (!existingBrowser && browser) await browser.close().catch(() => {})
  }
}

