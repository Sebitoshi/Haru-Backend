# 🛡️ Trust (Sistema de Confianza) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Mantener rankings limpios y recompensas justas en **Haru** analizando el comportamiento del usuario.

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

**Score inicial: 50/100 (neutral)**

---

## 🏷️ NIVELES DE CONFIANZA

| Nivel | Emoji | Score mínimo | Requisitos | Beneficios |
|-------|-------|-------------|------------|------------|
| Nuevo | 👤 | 0 | Recién registrado | Acceso básico |
| Confiable | 🌱 | 30 | 5+ misiones | Rankings, 5 evidencias/día |
| Muy Confiable | 🌿 | 60 | 20+ misiones | Ranking destacado, 10 evidencias/día |
| Excelente | ⭐ | 80 | 50+ misiones | Top ranking, verificación instantánea, ilimitado |

---

## ⏳ SISTEMA DE COOLDOWN

Después de un fraude detectado, el usuario entra en **cooldown de 7 días**:

```
Fraude detectado (-25 puntos)
       ↓
Cooldown activado por 7 días
       ↓
Durante el cooldown:
  ❌ Los puntos POSITIVOS no se aplican
  ✅ Los puntos NEGATIVOS siguen aplicándose
  📊 El score puede seguir bajando
       ↓
Después de 7 días:
  ✅ Los puntos positivos se vuelven a aplicar
```

**¿Por qué?**
- Penalizar temporalmente sin ser permanente
- Dar tiempo para que el usuario demuestre buen comportamiento
- Mantener integridad del sistema

---

## 🔄 SISTEMA DE REHABILITACIÓN

Si un usuario mantuvo nivel 🌿 por **30 días después de un fraude**, puede **restaurar puntos perdidos**:

```
Fraude detectado
       ↓
7 días de cooldown
       ↓
Cooldown termina
       ↓
Usuario demuestra buen comportamiento
       ↓
Mantiene nivel 🌿 por 30 días
       ↓
Rehabilitación elegible
       ↓
POST /trust/me/rehabilitate
       ↓
+15 puntos restaurados
Cooldown limpiado
Evento registrado
```

**Condiciones:**
1. Tener un fraude registrado (`lastFraudAt` no nulo)
2. Estar en nivel 🌿 Muy Confiable
3. Haber mantenido ese nivel por 30+ días
4. No haber sido rehabilitado antes

**¿Por qué +15 puntos?**
- El fraude resta -25 puntos
- La rehabilitación restaura +15 puntos (60% del daño)
- El usuario necesita demostrar consistencia para recuperar todo
- Es un incentivo fuerte sin ser fácil de abusar

---

## 🔄 FLUJO COMPLETO

```
Evento ocurre
       ↓
¿Está en cooldown?
├── Sí + impacto positivo → Bloquear (impact = 0)
├── Sí + impacto negativo → Aplicar normalmente
└── No → Aplicar normalmente
       ↓
Actualizar score (0-100)
       ↓
Evaluar nivel
       ↓
¿Es fraude?
├── Sí → Activar cooldown 7 días
└── No → Continuar
       ↓
¿Mantiene 🌿 por 30 días?
├── Sí → Rehabilitación elegible
└── No → Esperar
       ↓
Registrar TrustEvent
```

---

## 🕵️ DETECCIÓN DE FRAUDE

| Patrón | Umbral | Acción |
|--------|--------|--------|
| Rechazos en 24h | 3+ | Sospechoso |
| Rechazos en 7 días | 5+ | Fraude probable |
| Evidencia duplicada | Misma URL 2 veces | Fraude confirmado |
| Envíos rápidos | 5+ en 1 hora | Comportamiento sospechoso |

---

## 🌐 ENDPOINTS

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `GET /trust/me` | 🔒 | Usuario | Mi perfil (incluye cooldown y rehabilitación) |
| `GET /trust/leaderboard` | 🔒 | Usuario | Ranking de confianza |
| `POST /trust/me/rehabilitate` | 🔒 | Usuario | Intentar rehabilitación |
| `GET /trust/admin/stats` | 👑 | Admin | Estadísticas + cooldowns + rehabilitaciones |
| `GET /trust/admin/user/:id` | 👑 | Admin | Ver confianza de usuario |
| `POST /trust/admin/user/:id/pardon` | 👑 | Admin | Perdonar usuario |
| `POST /trust/admin/user/:id/warn` | 👑 | Admin | Advertir usuario |
| `GET /trust/admin/fraud/:id` | 👑 | Admin | Verificar patrones de fraude |

---

## 📊 MODELO DE DATOS

```prisma
model UserTrust {
  score           Int         @default(50)
  level           TrustLevel  @default(new_user)
  cooldownUntil   DateTime?   // After fraud: 7 days
  lastFraudAt     DateTime?   // When fraud was detected
  rehabilitatedAt DateTime?   // When rehabilitation completed
  scoreBeforeFraud Int?       // Score before fraud (for reference)
}

model TrustEvent {
  type      String   // verification_accepted, fraud_detected, rehabilitation, etc.
  impact    Int      // +/- score
  details   Json?    // { cooldownApplied, previousScore, newScore, ... }
}
```

---

## 🔑 REGLAS

1. **El score nunca es visible directamente** al usuario. Solo el nivel.
2. **El cooldown bloquea puntos positivos**, no negativos.
3. **La rehabilitación es un derecho, no un castigo.** El usuario puede elegir cuándo intentarla.
4. **Un usuario rehabilitado no puede ser rehabilitado otra vez.**
5. **Logging:** `[TrustService] Operation: details`
6. **"No es punitivo, es preventivo."**

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 2026-08-27 | Implementación completa: score, niveles, fraude, admin tools | Buffy |
| 2026-08-27 | +Cooldown 7 días, +Rehabilitación +15 puntos | Buffy |
