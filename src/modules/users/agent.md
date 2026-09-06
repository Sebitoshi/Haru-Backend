# 👤 Users — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/users/`

---

## 📌 PROPÓSITO

Gestión completa del usuario en **Haru**.

Responsabilidades:
- Perfil (username, email, avatar, bio)
- Preferencias (theme, lang, sound, notifications)
- Estadísticas generales
- Avatar con Cloudinary (upload/delete con validación MIME+size)
- Activity log (historial de acciones)
- Onboarding flow
- Username history (cooldown 30 días)
- Badges/etiquetas (15 badges — BadgeService)
- Eliminación de cuenta (GDPR soft delete — anonymiza datos)

---

## 🏗️ ARQUITECTURA

```
users/
├── users.service.ts            # Core: profile, avatar, preferences, stats, activity, onboarding, GDPR
├── users.controller.ts         # 11 endpoints bajo /api/users/
├── users.module.ts             # Module
├── badge.service.ts            # 15 badges: seed, check, progress, award
├── badge.controller.ts         # 5 endpoints bajo /api/badges/
├── dto/
│   ├── update-profile.dto.ts   # username?, avatarUrl?, bio?
│   └── update-preferences.dto.ts # theme?, language?, sound?, notifications?
└── agent.md
```

---

## 📊 MODELO DE DATOS

```text
User
├── id, username, email, passwordHash
├── avatarUrl, avatarPublicId (Cloudinary)
├── bio, onboardingCompleted, emailVerified
├── deletedAt (soft delete), level, totalXp, totalCoins
├── createdAt / updatedAt / lastLoginAt
├── emailVerifyCode, emailVerifyCodeExpires (OTP 6 dígitos)
├── preference (1:1)
├── activityLogs (1:N)
├── usernameHistory (1:N)
└── badges (N:M via UserBadge)

Badge
├── id, code (unique), name, description, icon
├── category (milestone | streak | collection | social)
├── requirement (JSON: { type, value, action? })
├── xpReward, coinsReward
└── users (N:M via UserBadge)

UserBadge
├── id, userId, badgeId, unlockedAt

UserPreference
├── id, userId, theme, language, sound, notifications

ActivityLog
├── id, userId, action, details (JSON), createdAt

UsernameHistory
├── id, userId, oldUsername, expiresAt (30 días)
```

---

## 🏷️ BADGES (15)

| Icon | Nombre | Categoría | Requisito | XP | Coins |
|------|--------|-----------|-----------|-----|-------|
| 👶 | Primeros Pasos | milestone | Onboarding completado | 10 | 5 |
| 🌱 | Recién Llegado | milestone | 1 día con Haru | 10 | 5 |
| 🌟 | Pionero | milestone | 7 días con Haru | 50 | 25 |
| 🎖️ | Veterano | milestone | 30 días con Haru | 100 | 50 |
| 🎯 | Primera Misión | milestone | 1 misión completada | 15 | 10 |
| 🏆 | Maestro de Misiones | milestone | 50 misiones completadas | 300 | 150 |
| 🎲 | Amante Sorpresas | milestone | 5 misiones sorpresa | 50 | 25 |
| ✨ | Perfil Completo | milestone | Avatar + bio + preferencias | 25 | 15 |
| 📅 | Consistente | streak | 3 días de racha (longestStreak) | 30 | 15 |
| 🔥 | En Llamas | streak | 7 días de racha (longestStreak) | 75 | 40 |
| ⚡ | Imparable | streak | 30 días de racha (longestStreak) | 200 | 100 |
| 🎒 | Coleccionista | collection | 10 objetos en inventario | 80 | 40 |
| 🛍️ | Comprador | collection | Primera compra en tienda | 20 | 10 |
| 👕 | Fashionista | collection | 5 objetos equipados | 50 | 25 |
| 🤝 | Amigable | social | 5 misiones sociales completadas | 60 | 30 |

### Lógica de Badges
- **Type `days`**: Compara `accountAgeDays >= value`
- **Type `streak`**: Usa `longestStreak` (una vez alcanzado, se mantiene aunque la racha se rompa)
- **Type `count`**: Cuenta acciones en `ActivityLog` por `action` string
- **Type `onboarding`**: `user.onboardingCompleted == true`
- **Type `profile_complete`**: `avatarUrl && bio && preference`

---

## ✅ ENDPOINTS USERS (11)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/users/me` | 🔒 | Perfil completo con preferencias |
| `PATCH /api/users/me/profile` | 🔒 | Actualizar username, avatar, bio (valida username cooldown 30d) |
| `POST /api/users/me/avatar` | 🔒 | Subir avatar a Cloudinary (max 5MB, JPEG/PNG/WebP/GIF) — borra el anterior |
| `DELETE /api/users/me/avatar` | 🔒 | Eliminar avatar de Cloudinary |
| `DELETE /api/users/me` | 🔒 | Eliminar cuenta (GDPR soft delete — anonymiza email, username, borra avatar) |
| `GET /api/users/me/preferences` | 🔒 | Obtener preferencias (auto-crea defaults si no existen) |
| `PATCH /api/users/me/preferences` | 🔒 | Actualizar preferencias (theme: system/light/dark, language: es/en, sound, notifications) |
| `GET /api/users/me/stats` | 🔒 | Estadísticas: accountAge, sessions, activities, lastLogin |
| `GET /api/users/me/activity` | 🔒 | Activity log (?limit=20) |
| `GET /api/users/me/onboarding` | 🔒 | Estado del onboarding |
| `POST /api/users/me/onboarding/complete` | 🔒 | Completar onboarding |

## ✅ ENDPOINTS BADGES (5)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /api/badges` | 🔒 | Todas las badges definidas |
| `GET /api/badges/me` | 🔒 | Badges desbloqueadas por el usuario |
| `GET /api/badges/me/progress` | 🔒 | Progreso con percentage por badge |
| `POST /api/badges/me/check` | 🔒 | Verificar y otorgar badges elegibles |
| `POST /api/badges/seed` | 🌐 | Sembrar 15 definiciones de badges |

---

## 🔑 REGLAS

1. **El backend controla el perfil.** Nunca confiar en datos del cliente.
2. **Username cooldown:** 30 días para reusar un nombre anterior.
3. **Avatar:** Max 5MB, formatos: JPEG/PNG/WebP/GIF. Se borra el anterior de Cloudinary.
4. **GDPR:** DeleteAccount es soft delete — anonymiza datos, borra avatar, revoca tokens.
5. **Preferencias:** Auto-crea defaults si no existen.
6. **Badges de streak:** Usan `longestStreak` (no `currentStreak`) — una vez ganado se mantiene.
7. **Logging:** `[UsersService|BadgeService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Fase 3: Profile, Preferences, Stats, Avatar Cloudinary, GDPR, Activity, Onboarding | Buffy |
| 2026-08-23 | Sistema de Badges/etiquetas (15 badges) | Buffy |
| 2026-08-25 | Renombrado a Haru | Buffy |
| 2026-09-05 | Badges de racha arreglados: ahora leen `longestStreak` — antes nunca se otorgaban | Buffy |
