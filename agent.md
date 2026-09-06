# 🌸 HARU — Agent Rules (Root)

> **Este archivo es la fuente de verdad del agente.**
> Antes de cualquier cambio, **LEER ESTE ARCHIVO COMPLETO**.
> Cada carpeta tiene su propio `agent.md` con reglas específicas.

---

## 🔑 REGLA MÁS IMPORTANTE

**SIEMPRE leer el `agent.md` de la carpeta donde se va a trabajar ANTES de escribir cualquier código.**

Si el usuario entrega reglas nuevas, copiarlas en el `agent.md` correspondiente.

---

## 🌸 CONCEPTO

**Haru** = plataforma de experiencias diarias gamificadas.
**Boti** 🤖 = el compañero IA de Haru. No es un chatbot separado.

Haru te hace **salir de la app para vivir**: Entrás → descubrís misión → salís → hacés algo real → volvés → verificás → guardás el recuerdo.

---

## 📁 MAPA DE CARPETAS

```text
src/
├── modules/
│   ├── auth/              ← Autenticación (13 endpoints: register, login, Google, JWT rotation, OTP, reset)
│   ├── users/             ← Perfil, badges (15), avatar, activity log, onboarding, GDPR (16 endpoints)
│   ├── boti/              ← Compañero IA: 9 expresiones, mood dinámico, memoria MongoDB, chat Groq, 4 modos, recommendations (17 endpoints)
│   ├── quests/            ← Motor de misiones: 26 semillas, weekly, streak multiplier, multi-step, AI propose, level unlock (16 endpoints)
│   ├── verification/      ← Verificación de evidencia: Groq Vision, Whisper, Geofence, batch SSE, fraud alerts (8 endpoints)
│   ├── progression/       ← XP (exponential), niveles (max 50), leaderboard (3 endpoints)
│   ├── economy/           ← Coins: earn/spend transaccional, 50+ shop items, mystery box, admin grant (7 endpoints)
│   ├── shop/              ← Tienda visual: 50+ items, 11 slots, filters, featured (4 endpoints)
│   ├── inventory/         ← Equipar/desequipar, loadout, Boti preview (4 endpoints)
│   ├── customization/     ← Apariencia Boti, 5 presets, preview, save/reset (7 endpoints)
│   ├── achievements/      ← 30 badges + 10 ranking badges, auto-detección, seed (4 endpoints)
│   ├── streaks/           ← Rachas: tracking, protection (200 coins), milestones (8), history (6 endpoints)
│   ├── ai/                ← Módulo contenedor — IA real en boti/ y common/groq/
│   ├── notifications/     ← Pendiente de implementación completa
│   ├── trust/             ← Sistema de confianza: score 0-100, 4 niveles, cooldown, rehabilitación, fraud alerts WebSocket (9 endpoints)
│   ├── diary/             ← Diario: auto-create, timeline Instagram, mapa clustering, calendar, stats, search (15 endpoints)
│   ├── friends/           ← Social: amistad, follow, feed, celebraciones, comparaciones, retos, share (22 endpoints)
│   ├── rankings/          ← Rankings: global, friends, streak, xp, missions, category, weekly, notifications (11 endpoints)
│   ├── collection/        ← 35 coleccionables: plants, badges, objects, postcards, specials, mystery box (7 endpoints)
│   ├── prisma/            ← PrismaService (global)
│   └── common/            ← Cloudinary + MongoDB + Email (SMTP/Resend/dry-run) + Groq Vision + Geofence
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── bootstrap.ts
└── main.ts
```

> Cada carpeta tiene su propio `agent.md`.

---

## 🏗️ STACK TECNOLÓGICO

| Capa | Tecnología |
|------|------------|
| Backend | NestJS 11 + TypeScript 5.7 |
| Frontend | Kotlin Multiplatform + Compose Multiplatform (Android + iOS) |
| DB relacional | PostgreSQL + Prisma 7 |
| DB documentos | MongoDB + Mongoose 9 |
| IA Chat | Groq llama-3.3-70b-versatile |
| IA Vision | Groq qwen/qwen3.6-27b (multimodal, gratis) |
| IA Audio | Groq Whisper (transcripción) |
| Geofence | API de geolocalización con POIs |
| Archivos | Cloudinary |
| Email | SMTP (nodemailer) / Resend / dry-run |
| WebSockets | Socket.io (admin dashboard, fraud alerts) |
| Despliegue | Vercel (optimización máxima) |

---

## 📋 FASES DE IMPLEMENTACIÓN

| Fase | Módulo | Estado |
|------|--------|--------|
| 1 | Arquitectura base (NestJS, Prisma, PostgreSQL, Docker) | ✅ Completado |
| 2 | Autenticación (JWT, Google OAuth, Refresh Rotation, OTP) | ✅ Completado |
| 3 | Users (perfil, badges, avatar Cloudinary, activity log, onboarding, GDPR) | ✅ Completado |
| 4 | Boti (personaje, expresiones, mood dinámico, memoria MongoDB) | ✅ Completado |
| 5 | XP y Niveles (progression, exponential curve, leaderboard) | ✅ Completado |
| 6 | Misiones (26 seeds, weekly, streak multiplier, multi-step, level unlock) | ✅ Completado |
| 7 | Verificación (Groq Vision, Whisper, Geofence, batch, streaming SSE) | ✅ Completado |
| 8 | Economía (coins transaccional, 50+ shop items, mystery box) | ✅ Completado |
| 9 | Tienda + Inventario (visual catalog, equip/unequip, Boti preview) | ✅ Completado |
| 10 | Personalización (apariencia Boti, 5 presets, preview, save) | ✅ Completado |
| 11 | Logros y Rachas (30 badges, 8 milestones, protection) | ✅ Completado |
| 12 | Sistema de confianza (score, niveles, cooldown, rehabilitación, fraud alerts) | ✅ Completado |
| 13 | Diario de recuerdos (timeline, mapa clustering, calendar, stats) | ✅ Completado |
| 14 | IA / Chat con Boti (Groq, 4 modos, perfilamiento, recommendations) | ✅ Completado |
| 15 | Amigos (amistad, follow, feed, celebraciones, retos, comparaciones) | ✅ Completado |
| 15b | Rankings (global, friends, streak, xp, missions, category, badges, notifications) | ✅ Completado |
| 16 | Colección (35 items, 5 tipos, auto-unlock, mystery box) | ✅ Completado |
| 17 | Notificaciones (ranking notifications + fraud alerts) | ⏳ Pendiente sistema completo |
| 18 | Panel de administración (37 endpoints, WebSocket, 2FA, fraud dashboard) | ✅ Completado |
| 19 | PWA y responsive | ⏳ Pendiente |

---

## 📊 TOTAL DE ENDPOINTS

| Módulo | Endpoints |
|--------|-----------|
| Auth | 13 |
| Users + Badges | 16 |
| Boti | 17 |
| Quests | 16 |
| Verification | 8 |
| Progression | 3 |
| Economy | 7 |
| Shop | 4 |
| Inventory | 4 |
| Customization | 7 |
| Achievements | 4 |
| Streaks | 6 |
| Trust | 9 |
| Diary | 15 |
| Friends | 22 |
| Rankings | 11 |
| Collection | 7 |
| Admin | 37 |
| **TOTAL** | **~206** |

---

## 🧠 REGLAS GENERALES DEL AGENTE

1. **Leer agent.md de la carpeta antes de trabajar en ella.**
2. **No crear módulos vacíos.** Cada fase debe dejar funcionalidad real de extremo a extremo.
3. **El backend calcula todo.** El frontend NUNCA decide XP, coins, nivel, etc.
4. **Las operaciones críticas son transaccionales.** Si algo falla, no deja datos parciales.
5. **La IA propone, el backend decide.** La IA nunca modifica la base de datos directamente.
6. **No sobreingeniarizar.** Solo construir lo que aporta valor real al usuario.
7. **Seguridad primero.** No confiar en datos del cliente. Validar todo.
8. **Cada decisión debe responder:** ¿Esto hace que Haru sea mejor para el usuario?
9. **📝 LOGGING OBLIGATORIO.** Todo error debe ser rastreable:
   - `console.log` o `Logger` con contexto identificable en cada operación crítica.
   - En errores: loggear `error.message`, `error.stack`, y datos relevantes.
   - Formato consistente: `[ModuleName] Operation: details`.
   - Nunca silenciar errores con `try/catch` vacío.
10. **💡 SUGERENCIAS SIEMPRE.** Al terminar cada módulo, ofrecer sugerencias concretas de mejoras.
11. **⚡ OPTIMIZACIÓN MÁXIMA PARA VERCEL.** Priorizar:
    - **Edge functions** cuando sea posible.
    - **Code splitting** agresivo y lazy loading.
    - **Caching inteligente** (ISR, stale-while-revalidate).
    - **Compresión de assets.**
    - **Pruning de dependencias.** Cada KB cuenta.
    - **Serverless-first.**
    - **Connection pooling** (PgBouncer o similar).
    - **Prisma optimizado:** `select`/`include` explícitos.
    - **CDN para assets estáticos.**

---

## 📝 CÓMO USAR ESTE ARCHIVO

- **Antes de cada cambio:** Leer `agent.md` de la carpeta afectada.
- **Si el usuario da reglas nuevas:** Copiarlas en el `agent.md` correspondiente.
- **Al terminar un cambio:** Actualizar el `agent.md` de esa carpeta con lo que se hizo.
- **Al cambiar de fase:** Actualizar el estado en la tabla de fases.
