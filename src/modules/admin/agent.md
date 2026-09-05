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

## 📊 CAPACIDADES DEL ADMIN (37 endpoints)

### 📊 Dashboard en tiempo real (WebSocket)
- Namespace: `/admin`
- Stats cada 30 segundos automáticamente
- Eventos en vivo: `admin-action`, `admin-promoted`, `fraud-alert`

### 👤 Gestión de Usuarios (4)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/users` | Listar | No |
| `GET /admin/users/:id` | Detalle completo | No |
| `PATCH /admin/users/:id/role` | Cambiar rol | ✅ Sí |
| `DELETE /admin/users/:id` | Eliminar (GDPR) | ✅ Sí |

### 🎯 Gestión de Misiones (5)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/quests` | Listar con stats | No |
| `POST /admin/quests` | Crear nueva | No |
| `PATCH /admin/quests/:id` | Editar | No |
| `PATCH /admin/quests/:id/toggle` | Activar/desactivar | No |
| `DELETE /admin/quests/:id` | Eliminar | No |

### 📸 Gestión de Verificaciones (3)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/verifications` | Listar todas | No |
| `POST /admin/verifications/batch-review` | Batch review | No |
| `POST /admin/verifications/batch-analyze` | Batch analyze | No |

### 🗂️ Gestión de Categorías (2)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/categories` | Listar con conteo de misiones | No |
| `PATCH /admin/categories/:id` | Actualizar configuración | No |

### 📝 Gestión de Reportes (3)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/reports` | Listar reportes (filtro por status) | No |
| `GET /admin/reports/stats` | Estadísticas de reportes | No |
| `PATCH /admin/reports/:id` | Revisar (reviewed/resolved/dismissed) | No |

### 🏆 Gestión de Rankings (3)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/rankings/config` | Ver configuración | No |
| `PATCH /admin/rankings/config` | Actualizar configuración | No |
| `POST /admin/rankings/reset-weekly` | Reset manual semanal | No |

### 🪙 Gestión de Recompensas (2)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/rewards/config` | Ver multiplicadores y bonos | No |
| `PATCH /admin/rewards/config` | Actualizar multiplicadores | No |

### 🛡️ Moderación de Contenido (4)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/moderation/diary` | Ver entradas de diario | No |
| `PATCH /admin/moderation/diary/:id/hide` | Ocultar entrada | No |
| `GET /admin/moderation/activity` | Ver actividad de usuarios | No |
| `DELETE /admin/moderation/activity/:id` | Eliminar actividad | No |

### 🔍 Fraud Dashboard (1)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/fraud/dashboard` | Dashboard de actividad sospechosa | No |

### ⚙️ System Config (2)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/config` | Ver toda la config | No |
| `PATCH /admin/config/:key` | Actualizar config | No |

### 📈 Analytics (1)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `GET /admin/analytics` | Métricas por período | No |

### 🏁 Otros (2)
| Endpoint | Acción | 2FA |
|----------|--------|-----|
| `POST /admin/promote-first` | Primer admin (público) | No |
| `GET /admin/audit-log` | Log de acciones admin | No |

---

## 🔍 FRAUD DASHBOARD

```
GET /admin/fraud/dashboard

{
  rejectedVerifications: [{ user, rejectedCount }],  // top 10
  lowTrustUsers: [{ userId, username, score, fraudAttempts }],  // score < 30
  fraudAlerts: [{ id, details, createdAt }],  // últimos 20
  topReportedUsers: [{ user, reportCount }],  // top 10
  summary: { totalRejected, totalLowTrust, totalFraudAlerts, totalReports }
}
```

---

## 🪙 REWARDS CONFIG (default)

```json
{
  "xpMultiplier": 1.0,
  "coinsMultiplier": 1.0,
  "streakBonusEnabled": true,
  "streakBonusPerDay": 0.10,
  "streakBonusMax": 0.50,
  "levelUpBonusCoins": true,
  "levelUpBonusFormula": "level * 10"
}
```

---

## 🏆 RANKINGS CONFIG (default)

```json
{
  "weeklyResetEnabled": true,
  "resetDay": "monday",
  "topPositionsRewarded": true,
  "rewards": {
    "1": { "xp": 500, "coins": 250 },
    "2": { "xp": 300, "coins": 150 },
    "3": { "xp": 200, "coins": 100 }
  }
}
```

---

## 📝 MODELOS DE SOPORTE

```prisma
enum ReportStatus { pending, reviewed, resolved, dismissed }
enum ReportReason { inappropriate_content, fraud, spam, harassment, fake_evidence, other }

model Report {
  reporterId, targetUserId?, targetEntryId?, targetVerificationId?
  reason, description?, status, reviewedBy?, reviewNote?, resolvedAt?
}

model SystemConfig {
  key (unique), value (Json), category, description?, updatedBy?
}
```

---

## 🔑 REGLAS

1. **Todos los endpoints admin usan `/api/admin/`** — separados de la app normal.
2. **2FA obligatorio** para acciones destructivas (delete, role change).
3. **Rate limit ilimitado** para admins.
4. **WebSocket real-time** para dashboard.
5. **Audit log** — cada acción admin se registra.
6. **Configuración persistida** en SystemConfig.
7. **Logging:** `[AdminService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Admin: CRUD misiones, usuarios, verificaciones, analytics | Buffy |
| 2026-08-27 | Admin: 2FA, WebSocket, audit log, rate limit bypass | Buffy |
| 2026-08-27 | Admin: Email notifications, promote-first | Buffy |
| 2026-08-31 | Admin: +Categorías, Reportes, Rankings, Recompensas, Moderación, Fraud Dashboard | Buffy |
| 2026-09-03 | Fix arranque: import de VerificationModule con `forwardRef` para romper dependencia circular Verification↔Trust↔Admin | Buffy |
