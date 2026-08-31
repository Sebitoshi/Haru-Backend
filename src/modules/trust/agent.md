# 🛡️ Trust (Sistema de Confianza) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Mantener rankings limpios y recompensas justas en **Haru** analizando el comportamiento del usuario.

---

## 🚨 ALERTAS DE FRAUDE EN TIEMPO REAL

**Cuando se detecta un patrón sospechoso, el admin recibe una notificación inmediata vía WebSocket.**

```
Usuario envía evidencia
       ↓
Verificación procesada
       ↓
checkAndAlert(userId)
       ↓
¿Patrón sospechoso?
├── No → Continuar normalmente
└── Sí →
    ↓
┌─── Determinar Severidad ───────────────────────────┐
│ warning: 1-2 patrones detectados                   │
│ critical: 3+ patrones detectados                   │
└───────────────────────────────────────────────────┘
       ↓
┌─── Enviar Alerta WebSocket ────────────────────────┐
│ Evento: 'fraud-alert'                              │
│ Datos: { user, trust, patterns, severity }         │
│ Destinatarios: Todos los admins conectados         │
└───────────────────────────────────────────────────┘
       ↓
┌─── Registrar en ActivityLog ───────────────────────┐
│ type: fraud_alert                                  │
│ details: { userId, patterns, severity }            │
└───────────────────────────────────────────────────┘
```

### Evento WebSocket: `fraud-alert`

```json
{
  "type": "fraud-alert",
  "severity": "warning | critical",
  "timestamp": "2026-08-27T18:00:00Z",
  "user": {
    "id": "uuid",
    "username": "carlos",
    "email": "carlos@test.com",
    "level": 3
  },
  "trust": {
    "score": 35,
    "level": "trustworthy",
    "fraudAttempts": 2
  },
  "patterns": [
    "3 rechazos en las últimas 24h",
    "Evidencia duplicada detectada"
  ],
  "message": "⚠️ Comportamiento sospechoso: carlos — 2 patrón(es) detectado(s)"
}
```

### Severidad

| Severidad | Criterio | Acción |
|-----------|----------|--------|
| ⚠️ `warning` | 1-2 patrones | Alerta visual + log |
| 🔴 `critical` | 3+ patrones | Alerta sonora + log + requiere revisión inmediata |

---

## 📊 FACTORES DE CONFIANZA

| Factor | Impacto | Descripción |
|--------|---------|-------------|
| Evidencias aceptadas | ✅ +5 | Misiones verificadas exitosamente |
| Evidencias rechazadas | ⚠️ -3 | Intentos de evidencia inválida |
| Reportes recibidos | ❌ -10 | Otros usuarios lo reportaron |
| Intentos de fraude | 🔴 -25 | Patrones sospechosos detectados |
| Misión completada | ✅ +2 | Bonus por completar misiones |
| Hito de racha | ✅ +3 | Alcanzar milestone de streak |
| Badge desbloqueado | ✅ +1 | Badge nuevo |
| Advertencia admin | ⚠️ -5 | Advertencia administrativa |
| Perdón admin | ✅ +10 | Admin perdonó incidente |
| Rehabilitación | ✅ +15 | Restauración tras buen comportamiento |

---

## ⏳ COOLDOWN (7 días)

Después de un fraude detectado:
- ❌ Puntos POSITIVOS no se aplican
- ✅ Puntos NEGATIVOS siguen aplicándose
- ⏳ Duración: 7 días

---

## 🔄 REHABILITACIÓN (+15 puntos)

Condiciones:
1. Tener fraude registrado
2. Estar en nivel 🌿 Muy Confiable
3. Mantener ese nivel 30+ días
4. No haber sido rehabilitado antes

---

## 🏷️ NIVELES DE CONFIANZA

| Nivel | Emoji | Score | Beneficios |
|-------|-------|-------|------------|
| Nuevo | 👤 | 0 | Acceso básico |
| Confiable | 🌱 | 30 | Rankings, 5 evidencias/día |
| Muy Confiable | 🌿 | 60 | Ranking destacado, 10 evidencias/día |
| Excelente | ⭐ | 80 | Top ranking, verificación instantánea |

---

## 🕵️ DETECCIÓN DE FRAUDE

| Patrón | Umbral | Severidad |
|--------|--------|-----------|
| Rechazos en 24h | 3+ | ⚠️ warning |
| Rechazos en 7 días | 5+ | 🔴 critical |
| Evidencia duplicada | Misma URL 2 veces | 🔴 critical |
| Envíos rápidos | 5+ en 1 hora | ⚠️ warning |

---

## 🌐 ENDPOINTS

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `GET /trust/me` | 🔒 | Usuario | Mi perfil completo |
| `GET /trust/leaderboard` | 🔒 | Usuario | Ranking de confianza |
| `POST /trust/me/rehabilitate` | 🔒 | Usuario | Intentar rehabilitación |
| `GET /trust/admin/stats` | 👑 | Admin | Estadísticas + cooldowns + rehabilitaciones |
| `GET /trust/admin/user/:id` | 👑 | Admin | Ver confianza de usuario |
| `POST /trust/admin/user/:id/pardon` | 👑 | Admin | Perdonar usuario |
| `POST /trust/admin/user/:id/warn` | 👑 | Admin | Advertir usuario |
| `GET /trust/admin/fraud/:id` | 👑 | Admin | Verificar patrones de fraude |
| `POST /trust/admin/fraud/:id/alert` | 👑 | Admin | Enviar alerta manual |

---

## 📊 MODELO DE DATOS

```prisma
model UserTrust {
  score, level, cooldownUntil, lastFraudAt
  rehabilitatedAt, scoreBeforeFraud
}

model TrustEvent {
  type, impact, details (JSON)
}
```

---

## 🔑 REGLAS

1. **El score nunca es visible directamente** al usuario. Solo el nivel.
2. **El cooldown bloquea puntos positivos**, no negativos.
3. **La rehabilitación es un derecho, no un castigo.**
4. **Las alertas de fraude se envían en tiempo real** a todos los admins conectados.
5. **Logging:** `[TrustService] Operation: details`
6. **"No es punitivo, es preventivo."**

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: score, niveles, fraude, admin tools | Buffy |
| 2026-08-27 | +Cooldown 7 días, +Rehabilitación +15 puntos | Buffy |
| 2026-08-27 | +Alertas de fraude en tiempo real (WebSocket) | Buffy |
