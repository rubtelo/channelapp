import puppeteer from 'puppeteer'

/**
 * Abre la URL con Puppeteer y escucha solicitudes de red
 * para capturar el primer .m3u8 encontrado.
 * @param {string} url - URL de la página que embebe el player
 * @returns {{ success: boolean, stream?: string, message?: string }}
 */
export async function getStream(url) {
  let browser

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    // User agent para evitar bloqueos básicos
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    )

    let streamUrl = null

    // Escuchar respuestas de red para detectar el .m3u8
    page.on('response', async (response) => {
      const responseUrl = response.url()
      if (responseUrl.includes('.m3u8') && !streamUrl) {
        console.log('   🎯 M3U8 detectado:', responseUrl)
        streamUrl = responseUrl
      }
    })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Intentar hacer click en el body para iniciar reproducción
    try {
      await page.click('body')
    } catch (_) {
      // Ignorar si no hay elemento clickable
    }

    // Esperar a que cargue el player y capture el stream
    await new Promise((resolve) => setTimeout(resolve, 8000))

    await browser.close()

    if (!streamUrl) {
      return { success: false, message: 'No se encontró ningún .m3u8 en la página' }
    }

    return { success: true, stream: streamUrl }

  } catch (error) {
    if (browser) await browser.close().catch(() => {})
    return { success: false, message: String(error) }
  }
}
