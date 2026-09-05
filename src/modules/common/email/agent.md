# 📧 Email — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/common/email/`

---

## 📌 PROPÓSITO

Servicio de correos transaccionales de **Haru**.

Responsabilidades:
- Verificación de email al registrarse con **código OTP de 6 dígitos** (`sendVerificationEmail`)
- Recuperación de contraseña (`sendPasswordResetEmail`)
- Notificaciones de acciones admin (`sendAdminActionEmail`)
- Envíos genéricos y por lotes (`sendEmail`, `sendBatchEmails`)

---

## 🚚 TRANSPORTE (se elige automáticamente en el constructor)

| Prioridad | Transporte | Se activa si… |
|-----------|------------|---------------|
| 1 | **SMTP** (nodemailer) | `SMTP_HOST` está configurado |
| 2 | **Resend** (API HTTP) | `RESEND_API_KEY` está configurada (y no hay SMTP) |
| 3 | **Dry-run** | no hay SMTP ni Resend → los correos se loguean en consola |

> nodemailer conecta de forma **perezosa** (al enviar), así que el arranque de la app nunca depende de que el SMTP esté disponible. Los fallos de envío se loguean y devuelven `{ sent: false }` — nunca bloquean la acción principal.

---

## 🔧 CONFIGURACIÓN (env)

| Variable | Uso | Sin configurar |
|----------|-----|----------------|
| `SMTP_HOST` | Servidor SMTP (Hostinger, Gmail, Outlook…) | Pasa a Resend / dry-run |
| `SMTP_PORT` | 587 (STARTTLS) o 465 (SSL). Default `587` | — |
| `SMTP_SECURE` | `true` SOLO con puerto 465 | Default `false` |
| `SMTP_USER` / `SMTP_PASS` | Credenciales de la cuenta que envía | — |
| `RESEND_API_KEY` | API key de resend.com (solo si no hay SMTP) | — |
| `EMAIL_FROM` | Remitente. Debe coincidir con la cuenta SMTP (o estar verificado en Resend) | Default `Haru <noreply@haru.app>` |
| `FRONTEND_URL` | Base del link de reset de contraseña | Default `http://localhost:5173` |

> Nota Gmail/Outlook: usar **app password** (no la contraseña normal) para `SMTP_PASS`.

---

## 🔑 REGLAS

1. **Un fallo de email NUNCA bloquea la acción principal.** Los métodos atrapan errores, loguean y devuelven `{ sent: false }`.
2. **Dry-run siempre disponible.** Sin SMTP ni Resend se imprime en consola qué se habría enviado, incluido el código/link (clicable en desarrollo).
3. **Logging obligatorio** con el Logger de Nest: `[EmailService] 📧 Operation: details`. Nunca `try/catch` vacío.
4. **Anti-enumeración.** Los flujos de auth responden igual exista o no la cuenta (quien llama decide, no el template).
5. **Secreto de un solo uso y con expiración** (código OTP 30 min, reset 1h).
6. **No crear templates por cada uso.** Si un correo nuevo comparte estructura, reutilizar `buildAuthEmail` / `buildAdminActionEmail`.
7. **Nuevos métodos de envío → pasar por `deliver()`** (transporte unificado), nunca duplicar la lógica SMTP/Resend/dry-run.

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-09-03 | +`sendVerificationEmail` y `sendPasswordResetEmail` con templates HTML y CTA. `EMAIL_FROM` y `FRONTEND_URL` configurables | Buffy |
| 2026-09-03 | `sendVerificationEmail` ahora envía **código OTP de 6 dígitos** (caja destacada) en vez de link | Buffy |
| 2026-09-03 | Refactor a **transporte unificado** (`deliver()`): SMTP (nodemailer) preferido → Resend → dry-run. Envs nuevos: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Buffy |
