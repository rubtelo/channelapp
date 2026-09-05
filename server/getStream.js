import puppeteer from 'puppeteer'

/**
 * Abre la URL y escucha solicitudes de red para capturar el primer .m3u8.
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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }

    page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    )

    // Escuchamos respuestas de red buscando el primer .m3u8
    return await new Promise((resolve) => {
      let resolved = false

      // Timeout de seguridad por si no carga nada
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
          resolve({ success: true, stream: responseUrl })
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
