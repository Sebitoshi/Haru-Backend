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
│   ├── auth/              ← Autenticación (guards, strategies, dto)
│   ├── users/             ← Perfil, badges, avatar, activity log
│   ├── boti/              ← Compañero IA, expresiones, mood, memoria
│   ├── quests/            ← Motor de misiones
│   ├── verification/      ← Sistema de verificación de evidencia
│   ├── progression/       ← XP y niveles
│   ├── economy/           ← Coins y transacciones
│   ├── shop/              ← Tienda cosmética
│   ├── inventory/         ← Objetos del usuario
│   ├── customization/     ← Personalización visual de Boti
│   ├── achievements/      ← Logros
│   ├── streaks/           ← Rachas diarias
│   ├── ai/                ← Integración IA con Boti
│   ├── notifications/     ← Notificaciones
│   ├── trust/             ← Sistema de confianza/reputación
│   ├── diary/             ← Diario de recuerdos
│   ├── friends/           ← Sistema social
│   ├── rankings/          ← Rankings
│   ├── collection/        ← Colección de objetos
│   ├── prisma/            ← PrismaService (global)
│   └── common/            ← Cloudinary + MongoDB
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

> Cada carpeta tiene su propio `agent.md`.

---

## 🏗️ STACK TECNOLÓGICO

| Capa | Tecnología |
|------|------------|
| Backend | NestJS + TypeScript |
| Frontend | React + TypeScript + Tailwind CSS |
| DB relacional | PostgreSQL + Prisma 7 |
| DB documentos | MongoDB + Mongoose |
| IA | Servicio integrado vía NestJS |
| Archivos | Cloudinary |
| Despliegue | Vercel (optimización máxima) |

---

## 📋 FASES DE IMPLEMENTACIÓN

| Fase | Módulo | Estado |
|------|--------|--------|
| 1 | Arquitectura base (NestJS, Prisma, PostgreSQL, Docker) | ✅ Completado |
| 2 | Autenticación (JWT, Google OAuth, Refresh Rotation) | ✅ Completado |
| 3 | Users (perfil, badges, avatar Cloudinary, activity log, onboarding) | ✅ Completado |
| 4 | Boti (personaje, expresiones, mood dinámico, memoria MongoDB) | ✅ Completado |
| 5 | XP y Niveles (progression) | ✅ Completado |
| 6 | Misiones (quests) | ✅ Completado |
| 7 | Verificación de evidencia (verification) | ✅ Completado |
| 8 | Economía (economy) | ⏳ Pendiente |
| 9 | Tienda + Inventario (shop, inventory) | ⏳ Pendiente |
| 10 | Personalización (customization) | ⏳ Pendiente |
| 11 | Logros y Rachas (achievements, streaks) | ✅ Completado |
| 12 | Sistema de confianza (trust) | ✅ Completado |
| 13 | Diario de recuerdos (diary) | ⏳ Pendiente |
| 14 | IA / Chat con Boti (ai) | ⏳ Pendiente |
| 15 | Amigos y Rankings (friends, rankings) | ⏳ Pendiente |
| 16 | Colección (collection) | ⏳ Pendiente |
| 17 | Notificaciones (notifications) | ⏳ Pendiente |
| 18 | Panel de administración (admin) | ✅ Completado |
| 19 | PWA y responsive | ⏳ Pendiente |

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
   - `console.log` con contexto identificable en cada operación crítica.
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
