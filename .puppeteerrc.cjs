const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Configura la caché de Puppeteer dentro de la carpeta del proyecto
  // para que Render la preserve entre el Build y el Runtime.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
