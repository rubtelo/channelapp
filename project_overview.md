# ChannelApp Project Overview

Este documento sirve como contexto consolidado para el sistema de gestión y reproducción de canales de TV.

## 🚀 Arquitectura General
El proyecto se divide en dos grandes componentes:
1. **Backend & Web Manager (`channelapp`)**: Servidor API robusto, Scraper optimizado y panel de administración web.
2. **Mobile/TV App (`channelflutter`)**: Aplicación Flutter optimizada para Android TV / Google TV.

---

## 🛠️ Stack Tecnológico Actualizado

### Backend (Node.js v16+)
- **Framework**: Express.
- **Scraping**: Puppeteer con **Browser Reuse** (reutiliza una única instancia para procesar todos los canales, reduciendo el consumo de RAM/CPU).
- **Logística**: 
  - **Detección Temprana**: Cierra la pestaña en cuanto detecta el `.m3u8`, acelerando el proceso significativamente.
  - **Sincronización**: Envía automáticamente los resultados a `https://cv.com.co/api/save.php` tras cada scrape exitoso.
  - **Timezone**: Las marcas de tiempo (`last_updated`) se generan en hora local **America/Bogota**.
- **Compatibilidad**: Usa `node-fetch` para soporte en versiones de Node inferiores a la 18.
- **Almacenamiento**: Archivos JSON locales (`public/tvdata.json` y `public/tvresult.json`).

### Frontend Web (React + Vite)
- **Framework**: React con TypeScript.
- **Seguridad**: Todas las peticiones al backend incluyen la cabecera `x-api-key: Adm1n1str4`.
- **Estilos**: Vanilla CSS con diseño moderno (Dark mode, glassmorphism).

---

## 📁 Estructura de Datos (JSON)

### `tvdata.json` (Configuración Fuente)
Contiene la lista de canales a procesar junto con sus links directos y de scraping.
```json
{
  "id": number,
  "title": "Nombre del canal",
  "logo": "nombre_archivo.png",
  "logo_url": "https://url_remota_logo.png",
  "active": boolean,
  "direct": [
    {
      "base": "URL_M3U8_Directa",
      "active": boolean
    }
  ],
  "link": [
    {
      "base": "URL_Web_Scraping",
      "active": boolean
    }
  ]
}
```

### `tvresult.json` (Resultados del Scraper)
Generado automáticamente y sincronizado con el servidor remoto.
```json
{
  "last_updated": "YYYY-MM-DDTHH:mm:ss (Local Bogota)",
  "data": [
    {
      "title": "Nombre del canal",
      "logo": "URL_remota_o_nombre_archivo",
      "sources": [
        {
          "link": "URL_M3U8_Valida"
        }
      ]
    }
  ]
}
```

---

## 📡 Endpoints de la API
Todos los endpoints requieren el header `x-api-key: Adm1n1str4`.

- `GET /api/channels`: Retorna el contenido de `tvresult.json`.
- `POST /api/scrape`: Inicia el proceso de Puppeteer (optimizado) y sincroniza con la API externa delegando en `server/scraper.js`.
- `POST /api/upload-results`: Permite subir un archivo JSON manualmente.

---

## 💻 Modos de Ejecución
1. **Modo Web Completo (Interfaz + API)**:
   ```bash
   npm run dev:all
   ```
2. **Modo Scraper Consola / Headless (Ideal para Google Colab o ejecución por terminal sin interfaz)**:
   ```bash
   npm run scrape
   ```

---

## 💡 Notas de Implementación (Skills)
1. **Scraping Modular**: La lógica central de extracción reside en `server/scraper.js`, siendo compartida tanto por el endpoint HTTP `/api/scrape` como por el ejecutor CLI `server/run-scrape.js`.
2. **Detección Rápida de Stream**: El archivo `server/getStream.js` utiliza promesas que resuelven por evento de red. Esto elimina tiempos muertos. Tiene un timeout de seguridad de 20s.
3. **Manejo de Navegador**: Se implementó una estructura de `try/finally` para asegurar que el navegador se cierre siempre, evitando fugas de memoria en ambientes de producción limitados.
4. **Seguridad**: Se centralizó la validación de tokens en un middleware `validateApiKey` en `server/index.js`.
5. **Optimización Front**: Las vistas de canales y resultados están diseñadas para mostrar links directos y estados de carga claros durante el proceso de scraping.
