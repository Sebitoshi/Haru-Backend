# 🔐 Auth — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/auth/`

---

## 📌 PROPÓSITO

Toda la autenticación y autorización del sistema **Haru**.

Responsabilidades:
- Registro de usuarios
- Login / Logout (email + Google)
- JWT (access + refresh tokens con rotation)
- Recuperación de contraseña
- Verificación de email
- Protección de endpoints
- Gestión de sesión

---

## 🏗️ DEPENDENCIAS

Este módulo es **base** para todo Haru. Todos los demás módulos dependen de auth para:
- Identificar al usuario (`request.user`)
- Verificar permisos
- Obtener el contexto de sesión

**Archivos compartidos en `src/modules/`:**
- `prisma/` → PrismaService (global)
- `common/cloudinary/` → CloudinaryService (global)
- `common/mongo/` → MongoModule (global)

---

## 🧩 SUBMÓDULOS (dentro de auth/)

| Submódulo | Responsabilidad |
|-----------|----------------|
| `users/` | Perfil, preferencias, avatar, badges, activity log |
| `boti/` | Compañero IA, expresiones, mood, memoria |
| `quests/` | Motor de misiones |
| `verification/` | Verificación de evidencia |
| `progression/` | XP y niveles |
| `economy/` | Coins y transacciones |
| `shop/` | Tienda cosmética |
| `inventory/` | Objetos del usuario |
| `customization/` | Personalización visual de Boti |
| `achievements/` | Logros |
| `streaks/` | Rachas diarias |
| `ai/` | Integración IA con Boti |
| `notifications/` | Notificaciones |
| `trust/` | Sistema de confianza |
| `diary/` | Diario de recuerdos |
| `friends/` | Sistema social |
| `rankings/` | Rankings |
| `collection/` | Colección de objetos |

---

## ✅ LO QUE SE IMPLEMENTÓ

### Auth Module (11 endpoints)

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | 🌐 Public | Registro |
| `/api/auth/login` | POST | 🌐 Public | Login |
| `/api/auth/google` | GET | 🌐 Public | Google OAuth redirect |
| `/api/auth/google/callback` | GET | 🌐 Public | Google callback |
| `/api/auth/refresh` | POST | 🔄 Refresh | Refresh Token Rotation |
| `/api/auth/logout` | POST | 🔒 Protected | Revoca refresh token |
| `/api/auth/logout-all` | POST | 🔒 Protected | Revoca todos los tokens |
| `/api/auth/forgot-password` | POST | 🌐 Public | Solicita reset |
| `/api/auth/reset-password` | POST | 🌐 Public | Resetea contraseña |
| `/api/auth/verify-email` | GET | 🌐 Public | Verifica email |
| `/api/auth/me` | GET | 🔒 Protected | Datos del usuario |

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Fase 1+2: Auth completo con PostgreSQL, JWT rotation, Google OAuth | Buffy |
| 2026-08-25 | Renombrado a HARU | Buffy |
| 2026-08-25 | Reestructurado a `src/modules/auth/` | Buffy |
| 2026-09-03 | Emails reales de verificación y reset con Resend en `register`, `resend-verification` y `forgot-password` (antes solo console.log). Envs: `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` | Buffy |
| 2026-09-03 | Google login ahora vincula cuenta email+password existente y la marca `emailVerified=true` (Google ya verificó ese email) | Buffy |
| 2026-09-03 | Verificación por **código OTP de 6 dígitos**: `POST /auth/verify-email-code` (campos `emailVerifyCode` + expiración 30 min en User). `register`/`resend-verification` generan y envían el código por email | Buffy |
