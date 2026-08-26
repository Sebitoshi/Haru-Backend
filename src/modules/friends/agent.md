# 👥 Friends (Sistema Social) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Sistema social de **Haru** para conectar usuarios sin convertirse en red social.

**Prioridad:** Haru te hace vivir experiencias en el mundo real, no pasar tiempo en la app.

---

## 👥 FUNCIONALIDADES

| Función | Descripción |
|---------|-------------|
| Agregar amigos | Enviar/solicitud de amistad |
| Seguir usuarios | Ver actividad pública |
| Ver actividad | Últimas misiones de amigos |
| Enviar misiones | Sugerir una misión a un amigo |
| Celebrar logros | Reaccionar a logros de amigos |
| Comparar rachas | Ver racha de amigos |
| Compartir recuerdos | Compartir un recuerdo del diario |

---

## 📊 MODELO DE DATOS

```text
Friendship
├── id
├── requesterId
├── addresseeId
├── status (pending | accepted | blocked)
├── createdAt
├── acceptedAt (optional)

FriendActivity
├── id
├── userId
├── type (quest_completed | level_up | achievement | streak | etc.)
├── details (JSON)
├── visibility (public | friends | private)
├── createdAt
```

---

## 🔄 FLUJO DE AMISTAD

```
Usuario A envía solicitud → Usuario B
       ↓
B acepta → Friendship status: accepted
       ↓
Ambos pueden:
  - Ver actividad del otro
  - Enviar misiones
  - Celebrar logros
  - Comparar rachas
```

---

## 🔑 REGLAS

1. **La amistad es bidireccional.** Ambos deben aceptar.
2. **Un usuario puede bloquear** a otro (sin notificar).
3. **La actividad tiene niveles de visibilidad.** El usuario controla qué se ve.
4. **No convertirse en red social.** Las funciones sociales son complementarias.
5. **No hay chat directo** inicialmente. Solo interacciones estructuradas.
6. **Máximo 200 amigos** (prevenir abuso).
7. **Logging:** `[FriendsService] Operation: details`
