import { runScraper } from './scraper.js'

console.log('═══════════════════════════════════════════════════════════')
console.log('📺 CHANNELAPP - SCRAPER CLI (Modo Consola / Google Colab)')
console.log('═══════════════════════════════════════════════════════════')

const startTime = Date.now()

runScraper()
  .then((output) => {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log(`✅ ¡PROCESO COMPLETADO EN ${elapsedSeconds}s!`)
    console.log(`📊 Canales con transmisiones activas: ${output.data.length}`)
    console.log(`🕒 Timestamp: ${output.last_updated}`)
    console.log('═══════════════════════════════════════════════════════════\n')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ ERROR CRÍTICO DURANTE EL SCRAPING:')
    console.error(err)
    process.exit(1)
  })
