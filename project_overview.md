# ChannelApp Project Overview

Este documento sirve como contexto consolidado para el sistema de gestión y reproducción de canales de TV.

## 🚀 Arquitectura General
El proyecto se divide en dos grandes componentes:
1. **Backend & Web Manager (`channelapp`)**: Servidor API, Scraper de streams y panel de administración web.
2. **Mobile/TV App (`channelflutter`)**: Aplicación Flutter optimizada para Android TV / Google TV.

---

## 🛠️ Stack Tecnológico

### Backend (Node.js)
- **Framework**: Express.
- **Scraping**: Puppeteer (automatización de navegador para capturar `.m3u8`).
- **Almacenamiento**: Archivos JSON locales (`public/tvdata.json` y `public/tvresult.json`).

### Frontend Web (React + Vite)
- **Framework**: React con TypeScript.
- **Estilos**: Vanilla CSS con diseño moderno (Dark mode, glassmorphism).
- **Funcionalidad**: Visualización de canales y carga manual de resultados JSON.

### App Móvil (Flutter)
- **Enfoque**: Google TV (Navegación por D-pad).
- **Video**: Reproductor compatible con HLS (.m3u8).

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
Generado automáticamente por el scraper o cargado manualmente a través del portal web.
```json
{
  "last_updated": "ISO8601_Timestamp",
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
- `POST /api/scrape`: Inicia el proceso de Puppeteer para actualizar los enlaces recorriendo `tvdata.json`.
- `POST /api/upload-results`: Permite subir un archivo JSON para sobrescribir los resultados actuales manualmente.

---

## 💡 Notas de Implementación (Skills)
1. **Scraping**: El archivo `server/getStream.js` utiliza un listener de red para detectar archivos `.m3u8` mientras el navegador carga la página de origen. Se eliminó la interacción de clic forzado para agilizar el proceso si el sitio carga el stream automáticamente.
2. **Navegación TV**: La app Flutter está diseñada para ser controlada con un control remoto, asegurando que el foco siempre sea visible.
3. **Carga de Archivos**: El portal web cuenta con un botón naranja "Cargar JSON" que permite subir resultados externos directamente al servidor.
