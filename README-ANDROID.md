
# AeroCam – Guía Android (Moto G 51)

Esta guía te lleva paso a paso para usar la app en tu teléfono.

## Opción A – RÁPIDA (sin APK)
1) Conectá **PC y teléfono** a la **misma Wi‑Fi**.
2) En el PC, abrí Terminal en el proyecto y corré:
   ```bat
   npm install
   npm start
   ```
3) Buscá la IP del PC:
   - Windows: abrir **CMD** → `ipconfig` → copiá **IPv4** (ej. 192.168.1.50).
4) En el teléfono, abrí el navegador e ingresá:
   - `http://TU-IP:3000/index.html`
   (desde ahí elegís **Usuario** o **Piloto**).
5) (Opcional) Agregar a **Pantalla de inicio** para que se vea como app.

Si no carga: desactiva el firewall o permití Node.js/puerto 3000 en redes privadas.

---

## Opción B – APK instalable con Capacitor
> El APK abrirá la URL del servidor de tu PC en la LAN. Por lo tanto, el **PC debe tener el servidor iniciado** (`npm start`).

### 1) Instalá Android Studio
- Descargar Android Studio desde el sitio oficial e instalar (incluye SDK y build tools).

### 2) Editá la IP en `capacitor.config.json`
- Abrí el archivo y reemplazá `192.168.1.50` por tu IP real.
- Elegí si abrir `index.html`, `usuario.html` o `aerocam.html`.

### 3) Preparar e integrar Android
En la carpeta del proyecto:
```bat
npm install
npx cap add android
npx cap copy
npx cap open android
```

### 4) Activar Depuración en el Moto G 51
- Ajustes → Acerca del teléfono → toca **Número de compilación** 7 veces.
- Ajustes → Sistema → **Opciones de desarrollador** → Activa **Depuración por USB**.

### 5) Compilar e instalar
- Conectá el teléfono por USB o usá un emulador.
- En Android Studio: botón **Run ▶** para instalar directamente.
- O **Build > Build APK(s)** para generar el APK y luego copiarlo al teléfono y abrirlo.

### 6) Ejecutá el servidor cada vez
- En el PC: `npm start`.
- En el teléfono: abrí la app. Deben estar en la **misma Wi‑Fi**.

### Problemas frecuentes
- **Pantalla en blanco**: revisá que la IP/URL en `capacitor.config.json` sea correcta y que el firewall permita puerto 3000.
- **Video no aparece (WebRTC)**: asegurate de estar en la misma red, permisos de cámara otorgados y sin VPN.
- **Quiero APK “Usuario” o “Piloto”**: cambia la URL a `usuario.html` o `aerocam.html` y repite `npx cap copy` + rebuild.

---

## Soporte rápido
- Menú:    `http://localhost:3000/index.html`
- Usuario: `http://localhost:3000/usuario.html`
- Piloto:  `http://localhost:3000/aerocam.html`
