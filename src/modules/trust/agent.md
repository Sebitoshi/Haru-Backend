# 🛡️ Trust (Sistema de Confianza) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/trust/`

---

## 📌 PROPÓSITO

Mantener rankings limpios y recompensas justas en **Haru** analizando el comportamiento del usuario. Score 0-100 con 4 niveles. Cooldown post-fraude. Rehabilitación.

---

## 🏗️ ARQUITECTURA

```
trust/
├── trust.service.ts              # Score, levels, fraud detection, cooldown, rehabilitation, alerts
├── trust.controller.ts           # 9 endpoints (3 user + 6 admin)
├── trust.module.ts               # Module (imports AdminModule via forwardRef)
└── agent.md
```

---

## 📊 4 NIVELES DE CONFIANZA

| Nivel | Emoji | Score min | Requisito extra | Beneficios |
|-------|-------|-----------|-----------------|------------|
| new_user | 👤 | 0 | — | Acceso básico |
| trustworthy | 🌱 | 30 | ≥5 quests completadas | Rankings, 5 evidencias/día |
| very_trustworthy | 🌿 | 60 | ≥20 quests completadas | Ranking destacado, evidencias prioritarias, 10/día |
| excellent | ⭐ | 80 | ≥50 quests completadas | Top ranking, verificación instantánea, ilimitado, badge exclusivo |

---

## 📊 SCORE IMPACTS

| Evento | Impacto |
|--------|---------|
| verification_accepted | +5 |
| verification_rejected | -3 |
| verification_needs_review | -1 |
| report_received | -10 |
| fraud_detected | -25 |
| quest_completed | +2 |
| streak_milestone | +3 |
| badge_unlocked | +1 |
| account_warning | -5 |
| admin_pardon | +10 |
| rehabilitation | +15 |

---

## ⏳ COOLDOWN (7 días)

Después de fraude detectado:
- ❌ Puntos POSITIVOS no se aplican
- ✅ Puntos NEGATIVOS siguen aplicándose
- Duración: 7 días desde `fraud_detected`
- Se extiende si hay otro fraude

---

## 🔄 REHABILITACIÓN (+15 puntos)

Condiciones:
1. Tener fraude registrado (`lastFraudAt`)
2. Estar en nivel 🌿 Muy Confiable
3. Mantener ese nivel 30+ días
4. No haber sido rehabilitado antes

```
POST /trust/me/rehabilitate
       ↓
¿Ya rehabilitado? → No
¿Sin fraude? → No
¿Nivel != very_trustworthy? → No
¿Días en nivel >= 30? → No
       ↓
+15 puntos → limpia cooldown → registra evento
```

---

## 🚨 DETECCIÓN DE FRAUDE

| Patrón | Umbral | Severidad |
|--------|--------|-----------|
| Rechazos en 24h | ≥3 | ⚠️ warning |
| Rechazos en 7 días | ≥5 | 🔴 critical |
| Evidencia duplicada | Misma URL 2+ veces | 🔴 critical |
| Envíos rápidos | ≥5 en 1 hora | ⚠️ warning |

### Alertas WebSocket en tiempo real
```
checkAndAlert(userId) → checkFraudPatterns()
       ↓
¿Patrón sospechoso?
├── No → Continuar
└── Sí →
    severity = patterns.length >= 3 ? 'critical' : 'warning'
    emitFraudAlert() → AdminGateway.pushEvent('fraud-alert', alert)
    → Todos los admins conectados reciben la alerta
```

---

## 🌐 ENDPOINTS (9)

### User (3)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /trust/me` | 🔒 | Mi perfil: level, score, cooldown, rehabilitation, recent events |
| `GET /trust/leaderboard` | 🔒 | Ranking de confianza |
| `POST /trust/me/rehabilitate` | 🔒 | Intentar rehabilitación |

### Admin (6) — @Admin()
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /trust/admin/stats` | 👑 | Stats: distribution, cooldowns, rehabilitations, suspicious users |
| `GET /trust/admin/user/:userId` | 👑 | Ver confianza de cualquier usuario |
| `POST /trust/admin/user/:userId/pardon` | 👑 | Perdonar (+10 puntos) |
| `POST /trust/admin/user/:userId/warn` | 👑 | Advertir (-5 puntos) |
| `GET /trust/admin/fraud/:userId` | 👑 | Verificar patrones de fraude |
| `POST /trust/admin/fraud/:userId/alert` | 👑 | Enviar alerta manual |

---

## 📊 MODELO DE DATOS

```prisma
model UserTrust {
  userId (unique), score (Int), level (TrustLevel enum)
  cooldownUntil?, lastFraudAt?, scoreBeforeFraud?
  rehabilitatedAt?, lastEvaluatedAt?
  totalAccepted, totalRejected, totalReports, fraudAttempts
}

model TrustEvent {
  id, userId, type, impact (Int), details (JSON), createdAt
}
```

---

## 🔑 REGLAS

1. **El score nunca es visible directamente** al usuario. Solo el nivel.
2. **El cooldown bloquea puntos positivos**, no negativos.
3. **La rehabilitación es un derecho, no un castigo.**
4. **Las alertas de fraude se envían en tiempo real** a todos los admins conectados.
5. **"No es punitivo, es preventivo."**
6. **Logging:** `[TrustService] Operation: details`

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: score, niveles, fraude, admin tools | Buffy |
| 2026-08-27 | +Cooldown 7 días, +Rehabilitación +15 puntos | Buffy |
| 2026-08-27 | +Alertas de fraude en tiempo real (WebSocket) | Buffy |
| 2026-09-03 | Fix arranque: import con `forwardRef` para romper dependencia circular Verification↔Trust↔Admin | Buffy |
