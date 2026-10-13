# Reclutamiento Pochtecas en Netlify

El sitio debe desplegarse con `RECLUTAMIENTO_POCHTECAS_FRONTEND` como directorio base para que Netlify lea `netlify.toml`, publique `index.html` y compile `netlify/functions/registro-pochteca.js`. La función es el proxy del mismo origen hacia Google Apps Script y evita que Chrome móvil dependa de CORS entre `netlify.app` y `script.google.com`.

Los adjuntos tienen un límite conjunto de 3 MiB antes de Base64. Los documentos que no se puedan leer, superen el límite o no quepan en el envío se registran como pendientes para seguimiento por WhatsApp; no deben impedir guardar los datos del candidato.

En el proyecto de Apps Script corporativo configura la propiedad `GOOGLE_CHAT_WEBHOOK` en Script Properties antes del despliegue. Rota el webhook que estaba incrustado en el código y revisa los permisos existentes de Drive; los nuevos archivos ya no reciben acceso automático de “cualquiera del dominio con el enlace”.
