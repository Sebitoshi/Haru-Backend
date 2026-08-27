# 👑 Admin — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/admin/`

---

## 📌 PROPÓSITO

Panel de administración de **Haru**. Acceso completo a todas las funcionalidades de la plataforma con endpoints separados (`/api/admin/*`).

---

## 🏗️ ARQUITECTURA

```
src/modules/admin/
├── admin.module.ts          ← Módulo con JwtModule + Gateway
├── admin.service.ts         ← Toda la lógica de negocio admin
├── admin.controller.ts      ← Endpoints bajo /api/admin/
└── admin.gateway.ts         ← WebSocket para dashboard en tiempo real
```

### Seguridad

```
AdminGuard (@Admin())     ← Verifica role=admin|superadmin en JWT
AdminThrottlerGuard       ← Admins tienen rate limit ilimitado
@Public()                 ← Solo para promote-first (cuando no hay admins)
2FA Confirmation          ← Acciones destructivas requieren token de confirmación
```

---

## 📊 CAPACIDADES DEL ADMIN

### 📊 Dashboard en tiempo real (WebSocket)
- Namespace: `/admin`
- Stats cada 30 segundos automáticamente
- Eventos en vivo: `admin-action`, `admin-promoted`
- Conexiones autenticadas con `authenticate`

### 👤 Gestión de Usuarios
| Acción | Descripción | 2FA |
|--------|-------------|-----|
| Listar | Paginación, búsqueda, filtro por rol | No |
| Detalle | Stats completos, actividad, verificaciones | No |
| Cambiar rol | user → admin → superadmin | ✅ Sí |
| Eliminar | Soft-delete + revoke tokens (GDPR) | ✅ Sí |

### 🎯 Gestión de Misiones
| Acción | Descripción | 2FA |
|--------|-------------|-----|
| Listar | Todas con stats de uso | No |
| Crear | Nueva misión manual | No |
| Editar | Actualizar campos | No |
| Toggle | Activar/desactivar | No |
| Eliminar | Hard delete si sin datos, deactivate si con datos | No |

### 📸 Gestión de Verificaciones
| Acción | Descripción | 2FA |
|--------|-------------|-----|
| Listar todas | De TODOS los usuarios | No |
| Batch review | Aprobar/rechazar hasta 50 de diferentes usuarios | No |
| Batch analyze | Ver evidencia de múltiples usuarios | No |

### 📈 Analytics
- Períodos: 24h, 7d, 30d, 90d
- Métricas: nuevos usuarios, misiones completadas, verificaciones, tasa de aprobación
- Top 10 usuarios más activos

### 📋 Audit Log
- Cada acción admin se registra en ActivityLog
- Filtros: adminId, acción específica
- Incluye: quién, qué, a quién, cuándo, detalles

---

## 🔐 SISTEMA DE CONFIRMACIÓN (2FA)

Acciones destructivas requieren un token temporal:

```
Paso 1: Llamada sin confirmationToken
→ Responde: { confirmationToken: "a1b2c3...", expiresIn: 60 }

Paso 2: Llamada con confirmationToken
→ Ejecuta la acción
```

Acciones que requieren 2FA:
- `admin_role_change`
- `admin_delete_user`
- `admin_delete_quest`
- `admin_promote_user`

Tokens: 60 segundos de vida, un solo uso, almacenados en memoria.

---

## 📡 WEBSOCKET EVENTS

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `authenticate` | Client → Server | Autenticar admin |
| `request-stats` | Client → Server | Pedir stats manualmente |
| `dashboard-stats` | Server → Client | Stats cada 30s |
| `admin-action` | Server → Client | Acción admin en tiempo real |
| `admin-promoted` | Server → Client | Primer admin promovido |

---

## 🌐 ENDPOINTS (15)

| Endpoint | Método | 2FA | Descripción |
|----------|--------|-----|-------------|
| `POST /admin/promote-first` | 🌐 | No | Primer admin (solo si no hay) |
| `GET /admin/dashboard` | 👑 | No | Dashboard completo |
| `GET /admin/audit-log` | 👑 | No | Log de acciones admin |
| `GET /admin/users` | 👑 | No | Listar usuarios |
| `GET /admin/users/:id` | 👑 | No | Detalle usuario |
| `PATCH /admin/users/:id/role` | 👑 | ✅ | Cambiar rol |
| `DELETE /admin/users/:id` | 👑 | ✅ | Eliminar usuario |
| `GET /admin/quests` | 👑 | No | Listar misiones |
| `POST /admin/quests` | 👑 | No | Crear misión |
| `PATCH /admin/quests/:id` | 👑 | No | Editar misión |
| `PATCH /admin/quests/:id/toggle` | 👑 | No | Activar/desactivar |
| `DELETE /admin/quests/:id` | 👑 | No | Eliminar misión |
| `GET /admin/verifications` | 👑 | No | Verificaciones globales |
| `POST /admin/verifications/batch-review` | 👑 | No | Batch review |
| `POST /admin/verifications/batch-analyze` | 👑 | No | Batch analyze |
| `GET /admin/analytics` | 👑 | No | Analytics |

---

## 📊 MODELO DE DATOS

```
User
├── role: UserRole (user | admin | superadmin)

ActivityLog (audit trail)
├── userId → admin
├── action: admin_*
├── details: { targetId, timestamp, ... }
```

---

## 🔑 REGLAS

1. **Admin tiene endpoints SEPARADOS** de los endpoints de usuario.
2. **Las acciones destructivas SIEMPRE requieren 2FA.**
3. **El primer admin se promueve con promote-first** (no existe ruta para crear admin directamente).
4. **Un superadmin puede eliminar a otros admins** pero no a sí mismo.
5. **El audit log es inmutable** — no se puede borrar.
6. **El WebSocket solo acepta conexiones autenticadas.**
7. **Rate limit ilimitado para admins** — necesitan acceso completo.
8. **Logging:** `[AdminService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: CRUD, 2FA, WebSocket, audit log, email notifications | Buffy |
