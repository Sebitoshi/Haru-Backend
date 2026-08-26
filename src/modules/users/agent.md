# 👤 Users — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Gestión completa del usuario en **Haru**.

Responsabilidades:
- Perfil (username, email, avatar, bio)
- Preferencias (theme, lang, sound, notifications)
- Estadísticas generales
- Avatar con Cloudinary (upload/delete)
- Activity log (historial de acciones)
- Onboarding flow
- Username history (cooldown 30 días)
- Badges/etiquetas (15 badges)
- Eliminación de cuenta (GDPR soft delete)

---

## 📊 MODELO DE DATOS

```text
User
├── id, username, email, passwordHash
├── avatarUrl, avatarPublicId (Cloudinary)
├── bio, onboardingCompleted, emailVerified
├── deletedAt (soft delete)
├── createdAt / updatedAt / lastLoginAt
├── preference (1:1)
├── activityLogs (1:N)
├── usernameHistory (1:N)
└── badges (N:M via UserBadge)

Badge
├── id, code (unique), name, description, icon
├── category (milestone | streak | collection | social)
├── requirement (JSON)
├── xpReward, coinsReward
└── users (N:M via UserBadge)

UserBadge
├── id, userId, badgeId, unlockedAt

UserPreference
├── id, userId, theme, language, sound, notifications

ActivityLog
├── id, userId, action, details (JSON), createdAt

UsernameHistory
├── id, userId, oldUsername, changedAt
```

---

## 🏷️ BADGES (15)

| Icon | Nombre | Categoría | Requisito |
|------|--------|-----------|-----------|
| 👶 | Primeros Pasos | milestone | Onboarding completado |
| 🌱 | Recién Llegado | milestone | 1 día con Haru |
| 🌟 | Pionero | milestone | 7 días con Haru |
| 🎖️ | Veterano | milestone | 30 días con Haru |
| 🎯 | Primera Misión | milestone | 1 misión completada |
| 🏆 | Maestro de Misiones | milestone | 50 misiones completadas |
| 🎲 | Amante Sorpresas | milestone | 5 misiones sorpresa |
| ✨ | Perfil Completo | milestone | Avatar + bio + preferencias |
| 📅 | Consistente | streak | 3 días de racha |
| 🔥 | En Llamas | streak | 7 días de racha |
| ⚡ | Imparable | streak | 30 días de racha |
| 🎒 | Coleccionista | collection | 10 objetos |
| 🛍️ | Comprador | collection | 1 compra |
| 👕 | Fashionista | collection | 5 objetos equipados |
| 🤝 | Amigable | social | 5 misiones sociales |

---

## ✅ LO QUE SE IMPLEMENTÓ

### Endpoints (11)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/users/me` | GET | Perfil completo con preferencias |
| `/api/users/me/profile` | PATCH | Actualizar username, avatar, bio |
| `/api/users/me/avatar` | POST | Subir avatar a Cloudinary |
| `/api/users/me/avatar` | DELETE | Eliminar avatar |
| `/api/users/me` | DELETE | Eliminar cuenta (GDPR) |
| `/api/users/me/preferences` | GET | Obtener preferencias |
| `/api/users/me/preferences` | PATCH | Actualizar preferencias |
| `/api/users/me/stats` | GET | Estadísticas |
| `/api/users/me/activity` | GET | Activity log |
| `/api/users/me/onboarding` | GET | Estado del onboarding |
| `/api/users/me/onboarding/complete` | POST | Completar onboarding |

### Endpoints Badges (5)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/badges` | GET | Todas las badges |
| `/api/badges/me` | GET | Badges del usuario |
| `/api/badges/me/progress` | GET | Progreso con porcentaje |
| `/api/badges/me/check` | POST | Verificar y otorgar |
| `/api/badges/seed` | POST | Sembrar definiciones |

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-23 | Fase 3 Users: Profile, Preferences, Stats | Buffy |
| 2026-08-23 | Avatar Cloudinary, GDPR, Activity, Onboarding, Username History | Buffy |
| 2026-08-23 | Sistema de Badges/etiquetas (15 badges) | Buffy |
| 2026-08-25 | Renombrado a Haru | Buffy |
