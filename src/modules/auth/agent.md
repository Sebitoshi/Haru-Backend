# 🔐 Auth — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/auth/`

---

## 📌 PROPÓSITO

Toda la autenticación y autorización del sistema **Haru**.

Responsabilidades:
- Registro de usuarios (email + password, con hashing bcrypt salt 12)
- Login / Logout (email + Google)
- JWT (access + refresh tokens con rotation — cada refresh genera nuevos tokens)
- Recuperación de contraseña (token por email)
- Verificación de email (código OTP de 6 dígitos + link token)
- Resend de verificación (reenvío de código OTP)
- Protección de endpoints con guards
- Gestión de sesión (logout individual, logout all devices)
- Auto-creación de Boti al registrarse
- Auto-vinculación de cuenta Google con email/password existente

---

## 🏗️ ARQUITECTURA

```
auth/
├── auth.service.ts              # Lógica: register, login, Google, refresh, logout, verify, reset
├── auth.controller.ts           # 13 endpoints bajo /api/auth/
├── auth.module.ts               # Module: importa TODOS los módulos del sistema
├── strategies/
│   ├── jwt.strategy.ts          # Passport JWT (access token) — valida payload y busca user en DB
│   ├── jwt-refresh.strategy.ts  # Passport JWT Refresh — valida token en DB, retorna refreshTokenId
│   └── google.strategy.ts       # Passport Google OAuth20
├── guards/
│   ├── jwt-auth.guard.ts        # Guard global: lee @Public() decorator, skip si público
│   ├── jwt-refresh-auth.guard.ts # Guard para refresh token
│   ├── admin.guard.ts           # @Admin(), @SuperAdmin(), @Roles() — verifica role en JWT
│   ├── google-auth.guard.ts     # Guard para Google OAuth
│   ├── public.decorator.ts      # @Public() — marca endpoint como público
│   └── admin-throttler.guard.ts # Rate limit: admins ilimitados, users 60 req/min
├── dto/
│   ├── register.dto.ts          # username (3-30, alfanumérico+_), email, password (8+, mayús+minús+dígito)
│   ├── login.dto.ts             # email, password
│   ├── forgot-password.dto.ts   # email
│   ├── reset-password.dto.ts    # token, password (misma validación que register)
│   ├── verify-email.dto.ts      # token (link)
│   └── verify-email-code.dto.ts # email + code (6 dígitos exactos)
└── agent.md
```

---

## 🌐 ENDPOINTS (13)

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | 🌐 Public | Registro — crea user + Boti + envía código OTP + retorna tokens |
| `/api/auth/login` | POST | 🌐 Public | Login — valida email+password, actualiza lastLoginAt |
| `/api/auth/google` | GET | 🌐 Public | Google OAuth redirect (via GoogleAuthGuard) |
| `/api/auth/google/callback` | GET | 🌐 Public | Google callback — auto-vincula o crea cuenta |
| `/api/auth/refresh` | POST | 🔄 Refresh | Refresh Token Rotation — reviega el viejo, genera nuevos |
| `/api/auth/logout` | POST | 🔒 Protected | Revoca el refresh token enviado en header |
| `/api/auth/logout-all` | POST | 🔒 Protected | Revoca TODOS los refresh tokens del usuario |
| `/api/auth/forgot-password` | POST | 🌐 Public | Genera token de reset (1h expiry), envía email |
| `/api/auth/reset-password` | POST | 🌐 Public | Resetea contraseña + revoca todos los tokens |
| `/api/auth/verify-email` | GET | 🌐 Public | Verifica email por link token |
| `/api/auth/verify-email-code` | POST | 🌐 Public | Verifica email por código OTP de 6 dígitos (30 min expiry) |
| `/api/auth/resend-verification` | POST | 🌐 Public | Reenvía código OTP nuevo |
| `/api/auth/me` | GET | 🔒 Protected | Datos del usuario autenticado |

---

## 🔑 ESTRATEGIAS PASSPORT

### JWT Strategy (access token)
- Extrae Bearer token del header
- Decodifica payload `{ sub: userId, email }`
- Busca usuario en DB con select: id, email, username, role, avatarUrl, emailVerified, createdAt
- Retorna el usuario completo → `request.user`

### JWT Refresh Strategy
- Extrae Bearer token del header
- Busca el token EXACTO en DB (no revocado, no expirado)
- Si no existe o está revocado → **TOKEN REUSE DETECTADO** → revoca TODOS los tokens del usuario
- Retorna `{ user, refreshTokenId }` → para rotation en `refreshTokens()`

### Google Strategy
- OAuth20 con `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Scope: email, profile
- Extrae: googleId, email, name, avatar

---

## 🛡️ SEGURIDAD

1. **Refresh Token Rotation** — Cada refresh genera nuevos tokens y reviega el viejo. Si alguien reutiliza un token viejo → se revocan TODOS los tokens del usuario.
2. **Password Hashing** — bcrypt con salt rounds 12.
3. **Anti-enumeración** — Forgot-password y resend-verification siempre retornan el mismo mensaje sin importar si el email existe.
4. **Token Expiry** — Access: 15min (configurable), Refresh: 7d (configurable).
5. **Rate Limiting** — Admins: ilimitado. Users: 60 req/min (AdminThrottlerGuard).
6. **OTP Expiry** — Código de verificación expira en 30 minutos.
7. **Reset Token Expiry** — Token de reset expira en 1 hora.
8. **Username Validation** — 3-30 chars, solo alfanumérico + underscore.
9. **Password Validation** — 8-128 chars, al menos 1 mayúscula, 1 minúscula, 1 dígito.

---

## 🔄 FLUJO DE GOOGLE OAUTH

```
GET /auth/google → redirige a Google
       ↓
Google callback → GoogleStrategy.validate() → extrae profile
       ↓
AuthService.googleLogin(profile):
  ¿Usuario con googleId o email existe?
  ├── Sí (email/password existente):
  │   → Vincula googleId + avatar + emailVerified=true
  └── No:
      → Crea usuario nuevo con username del email
  ↓
Actualiza lastLoginAt → genera token pair → retorna
```

---

## 📁 DEPENDENCIAS

| Módulo | Uso |
|--------|-----|
| `prisma/` | PrismaService — queries a PostgreSQL |
| `boti/` | BotiService — auto-crea Boti al registrarse |
| `common/email/` | EmailService — envía emails de verificación y reset |
| `@nestjs/jwt` | JwtService — sign/decode tokens |
| `@nestjs/passport` | Passport strategies |
| `bcrypt` | Hashing de passwords |

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Auth completo: JWT rotation, Google OAuth, refresh token rotation, DB-backed tokens | Buffy |
| 2026-08-25 | Reestructurado a `src/modules/auth/` con subcarpetas strategies/guards/dto | Buffy |
| 2026-09-03 | Emails reales con Resend/SMTP — `sendVerificationEmail` + `sendPasswordResetEmail`. Envs: `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` | Buffy |
| 2026-09-03 | Google login vincula cuenta email+password existente + marca `emailVerified=true` | Buffy |
| 2026-09-03 | Verificación por código OTP de 6 dígitos (`POST /verify-email-code`) con expiración 30 min | Buffy |
| 2026-09-03 | `POST /resend-verification` genera nuevo código OTP y lo reenvía | Buffy |
| 2026-09-03 | AuthModule importa TODOS los módulos del sistema (imports completos) | Buffy |
| 2026-09-05 | Fix: AdminThrottlerGuard ahora detecta admin/superadmin y omite rate limit | Buffy |
