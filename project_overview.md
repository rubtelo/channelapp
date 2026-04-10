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
Contiene la lista de canales a procesar junto con sus links de origen.
```json
{
  "id": number,
  "title": "Nombre del canal",
  "logo": "nombre_archivo.png",
  "base_link": "URL_scraping_1",
  "second_link": "URL_scraping_2",
  "active": boolean
}
```

### `tvresult.json` (Resultados del Scraper)
Generado automáticamente y sincronizado con el servidor remoto.
```json
{
  "last_updated": "YYYY-MM-DDTHH:mm:ss (Local Bogota)",
  "data": [
    {
      "title": "Nombre",
      "logo": "nombre_logo.png",
      "sources": [
        { "id": 1, "link": "URL_M3U8_Directa" }
      ]
    }
  ]
}
```

---

## 📡 Endpoints de la API
Todos los endpoints requieren el header `x-api-key: Adm1n1str4`.

- `GET /api/channels`: Retorna el contenido de `tvresult.json`.
- `POST /api/scrape`: Inicia el proceso de Puppeteer (optimizado) y sincroniza con la API externa.
- `POST /api/upload-results`: Permite subir un archivo JSON manualmente.

---

## 💡 Notas de Implementación (Skills)
1. **Scraping**: El archivo `server/getStream.js` utiliza promesas que resuelven por evento de red. Esto elimina tiempos muertos (no hay esperas fijas de 8s). Tiene un timeout de seguridad de 20s.
2. **Manejo de Navegador**: Se implementó una estructura de `try/finally` para asegurar que el navegador se cierre siempre, evitando fugas de memoria en ambientes de producción limitados.
3. **Seguridad**: Se centralizó la validación de tokens en un middleware `validateApiKey` en `server/index.js`.
4. **Optimización Front**: Las vistas de canales y resultados están diseñadas para mostrar links directos y estados de carga claros durante el proceso de scraping.
