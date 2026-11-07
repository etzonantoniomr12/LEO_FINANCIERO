# LEO_FINANCIERO

PWA local-first para administrar fondos, ingresos, egresos y transferencias. Los datos se guardan en IndexedDB y pueden respaldarse manualmente en un Google Sheet autorizado.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm ci
npm run dev
npm test
npm run build
```

Copia `.env.example` como `.env.local` y completa las variables únicamente en tu equipo. `.env.local` está excluido de Git.

## Publicar en GitHub Pages

1. Crea un repositorio público llamado `LEO_FINANCIERO` con rama `main`.
2. Sube el contenido de esta carpeta a la raíz del repositorio. `package.json` debe quedar en la raíz, no dentro de otra carpeta.
3. En GitHub abre **Settings → Pages** y selecciona **GitHub Actions** como origen.
4. En **Settings → Secrets and variables → Actions → Variables** crea, cuando estén disponibles:
   - `VITE_GOOGLE_CLIENT_ID`: ID del cliente OAuth web.
   - `VITE_GOOGLE_SHEET_ID`: ID del Sheet autorizado.
5. El workflow `Publicar LEO_FINANCIERO` ejecutará las pruebas, compilará y publicará la PWA.

La URL final tendrá esta forma:

```text
https://TU_USUARIO.github.io/LEO_FINANCIERO/
```

Para Google Sheets, añade `https://TU_USUARIO.github.io` a los orígenes JavaScript autorizados del cliente OAuth. El origen no incluye `/LEO_FINANCIERO/`.

## Instalación en Android

Abre la URL publicada en Chrome y selecciona **⋮ → Instalar aplicación**. La base local del teléfono es independiente de la base usada durante el desarrollo en la laptop.

## Seguridad

- No publiques `.env.local`.
- No guardes tokens, contraseñas ni secretos OAuth en el repositorio.
- El ID del Sheet y el cliente OAuth se inyectan durante la publicación mediante variables de GitHub.
