# 📖 Diary (Diario de Recuerdos) — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Cada misión importante completada en **Haru** se convierte en un **recuerdo** dentro del diario personal del usuario.

Con el tiempo, Haru construye una **historia personal** de experiencias.

---

## 📸 CONTENIDO DE UN RECUERDO

| Campo | Descripción |
|-------|-------------|
| 📸 Foto | Evidencia de la misión |
| 📅 Fecha | Cuándo ocurrió |
| 📍 Lugar | Dónde ocurrió (si aplica) |
| 🎯 Misión | Qué misión se completó |
| 🌿 Categoría | Naturaleza, creatividad, etc. |
| 📝 Texto | Descripción o reflexión del usuario |
| 🎭 Estado de ánimo | Opcional: cómo se sentía |
| ⭐ XP ganado | Recompensa obtenida |
| 🪙 Coins ganados | Recompensa obtenida |

---

## 📊 MODELO DE DATOS

```text
DiaryEntry
├── id
├── userId
├── questId
├── userQuestId
├── title (auto-generated o del usuario)
├── description (optional)
├── photoUrl (Cloudinary, from verification)
├── location (JSON: lat, lng, name, optional)
├── mood (enum: amazing | happy | calm | tired | reflective, optional)
├── category (from quest)
├── xpEarned
├── coinsEarned
├── tags (JSON array, optional)
├── isFavorite (boolean)
├── createdAt
└── updatedAt
```

---

## 🔄 FLUJO

```
Misión verificada exitosamente
       ↓
Se crea DiaryEntry automáticamente
       ↓
Foto de verificación → foto del recuerdo
Misión → título del recuerdo
Categoría → etiqueta del recuerdo
       ↓
El usuario puede editar:
  - título
  - descripción/reflexión
  - estado de ánimo
  - marcar como favorito
       ↓
El diario se construye con el tiempo
```

---

## 🎨 VISTAS DEL DIARIO

- **Lista cronológica** — Todos los recuerdos
- **Por categoría** — Filtrar por tipo de experiencia
- **Favoritos** — Solo los marcados
- **Calendario** — Ver días con actividad
- **Mapa** — Recuerdos por ubicación (futuro)

---

## 🔑 REGLAS

1. **El recuerdo se crea automáticamente** al verificar una misión.
2. **El usuario puede editar** título, descripción y estado de ánimo.
3. **No se puede eliminar** un recuerdo (solo ocultar/favorito).
4. **Las fotos se almacenan en Cloudinary.**
5. **El diario es privado** por defecto. El usuario puede compartir recuerdos individuales (futuro).
6. **El diario alimenta la memoria de Boti** para recomendaciones contextuales.
7. **Logging:** `[DiaryService] Operation: details`
