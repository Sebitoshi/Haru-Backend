# 🔔 Notifications — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**
> **Ruta:** `src/modules/notifications/`

---

## 📌 PROPÓSITO

Sistema de notificaciones de **Haru**. Actualmente en fase pendiente de implementación completa.

---

## 🏗️ ARQUITECTURA

```
notifications/
├── notifications.service.ts      # Service
├── notifications.controller.ts   # Controller
├── notifications.module.ts       # Module
└── agent.md
```

---

## 📊 NOTIFICACIONES EXISTENTES (generadas por otros módulos)

Las notificaciones actualmente se generan como parte de otros módulos, no como un sistema independiente:

| Módulo | Tipo de notificación | Dónde se genera |
|--------|---------------------|-----------------|
| **Rankings** | position_up, position_down, badge_unlocked, top_3, weekly_reset | `RankingNotificationService.checkAfterQuestCompletion()` |
| **Trust** | fraud-alert | `TrustService.emitFraudAlert()` → WebSocket AdminGateway |
| **Admin** | admin-action, admin-promoted, fraud-alert | `AdminGateway.pushEvent()` |

---

## 🔑 REGLAS

1. **Máximo 1-2 notificaciones por día.**
2. **El usuario controla qué recibe.**
3. **Las notificaciones de Boti deben sentirse naturales**, no spam.
4. **Calidad sobre cantidad.**
5. **Pendiente:** Push notifications, PWA, sistema de notificaciones independiente.

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| — | Pendiente de implementar sistema completo | — |
