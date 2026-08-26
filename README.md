# 🌸 HARU — Prompt Maestro

> **"Haz que hoy tenga algo que recordar."**

Haru es una aplicación móvil chill y gamificada que ayuda a las personas a salir de la rutina y vivir pequeñas experiencias todos los días. Su compañero inteligente, **Boti** 🤖, acompaña al usuario, recomienda misiones y aprende de sus preferencias.

---

## 🌸 CONCEPTO

**Haru** = plataforma de experiencias diarias.
**Boti** = el compañero IA que conoc, acompaña y motiva al usuario.

El usuario no debería pasar horas dentro de la aplicación. Haru te hace **salir de la app para vivir**:

```
Entras → descubres tu misión → sales → haces algo real → vuelves → verificas → guardas el recuerdo
```

No es:
- una lista de tareas
- una app empresarial
- una red social
- un calendario
- una app financiera

Es una **aventura personal gamificada** con un compañero inteligente.

---

## 🧩 MÓDULOS DE HARU

### 1. 🔐 Autenticación
Registro, Login, Google/Apple, JWT, Refresh Token, recuperación de contraseña, verificación de email, gestión de sesión.

### 2. 👤 Perfil (Users)
Nombre, username, avatar, biografía, nivel, XP, monedas, rachas, insignias, estadísticas.

### 3. 🤖 Boti (Compañero IA)
Personaje 2D con expresiones, personalidad, mood dinámico, memoria contextual, saludos inteligentes, interacciones.

### 4. 🎯 Motor de Misiones (Quests) ⭐
Misiones diarias, semanales, especiales. 9 categorías: 🌿 Naturaleza, 🎨 Creatividad, ❤️ Bondad, 🧠 Aprendizaje, 🏃 Movimiento, 👥 Social, 📸 Fotografía, 🌙 Tranquilidad, 🗺️ Aventura. Dificultad, duración, XP, monedas.

### 5. 📸 Verificación (Verification) ⭐
El usuario sube evidencia (foto, video, audio, texto, ubicación). La IA analiza y verifica. Estados: Analizando → Verificado / Rechazado / Revisión.

### 6. 📈 Progresión (Progression)
XP, niveles, curva de experiencia configurable. El backend calcula todo.

### 7. 🪙 Economía (Economy)
Moneda virtual "Coins". Se gana con misiones, logros, rachas. Solo cosmética. Sin dinero real.

### 8. 🛍️ Tienda (Shop)
Objetos cosméticos: ropa, sombreros, gafas, accesorios, mochilas, efectos, skins, expresiones.

### 9. 🎒 Inventario (Inventory)
Objetos del usuario. Equipar, desequipar, filtrar, ordenar.

### 10. 👕 Personalización (Customization)
Cuerpo, color, ropa, cabeza, ojos, accesorios, expresiones, efectos. 100% cosmética.

### 11. 🏆 Logros (Achievements)
Milestones desbloqueables. Recompensan XP, Coins, cosméticos.

### 12. 🔥 Rachas (Streaks)
Días consecutivos de actividad. Flexibles, no ansiosos. "No pasa nada 🌱. Tu aventura continúa."

### 13. 🤖 IA / Boti (AI) ⭐⭐⭐
El módulo más importante. Boti analiza comportamiento, aprende preferencias, recomienda misiones, personaliza dificultad, genera misiones dinámicas. Modos: Recomendador, Motivador, Explorador, Narrador.

### 14. 🔔 Notificaciones (Notifications)
Misión diaria, racha, recompensas, recordatorios. Controlable por el usuario.

### 15. 🛡️ Sistema de Confianza (Trust)
Análisis de comportamiento, evidencias aceptadas/rechazadas, reportes, fraude. Niveles: 🌱 Confiable → 🌿 Muy confiable → ⭐ Excelente reputación.

### 16. 📖 Diario (Diary)
Cada misión importante se convierte en un recuerdo: foto, fecha, lugar, categoría, texto, estado de ánimo.

### 17. 👥 Amigos (Friends)
Agregar amigos, seguir usuarios, ver actividad, enviar misiones, celebrar logros. Sin convertirse en red social.

### 18. 🌎 Rankings (Rankings)
Global, País, Amigos, Racha, XP, Misiones, Categorías. Rankings semanales para diversidad.

### 19. 🎒 Colección (Collection)
Objetos coleccionables desbloqueables: insignias, plantas, objetos, postales, especiales.

### 20. 👑 Panel Admin
Gestión de misiones, categorías, usuarios, evidencias, reportes, rankings, moderación.

---

## 🔄 EL CICLO PRINCIPAL

```
Boti recomienda
   ↓
Usuario descubre una misión
   ↓
Usuario acepta
   ↓
Realiza la misión en el mundo real
   ↓
Sube evidencia
   ↓
Haru verifica
   ↓
Usuario recibe XP + monedas + progreso
   ↓
Se crea un recuerdo
   ↓
Aumenta la racha
   ↓
Puede compartirlo con amigos
   ↓
Boti aprende de la experiencia
   ↓
Boti prepara una nueva misión
   ↓
🔄 Vuelve mañana
```

---

## 🤖 BOTI — El Compañero

Boti no es un chatbot genérico. Es el personaje central de Haru.

**Personalidad:** amigable, divertida, curiosa, cercana, espontánea, ligeramente graciosa, no infantil ni excesivamente motivacional.

**Capacidades:**
- Recomendar misiones basadas en preferencia
- Personalizar dificultad
- Aprender gustos del usuario
- Evitar retos repetitivos
- Analizar evidencias
- Celebrar logros
- Crear aventuras compuestas

**Expresiones:** calm, happy, curious, surprised, confused, tired, excited, celebrating, worried

**Memoria contextual (MongoDB):** preferencias, eventos, hitos, contexto.

---

## 🏗️ STACK TECNOLÓGICO

| Capa | Tecnología |
|------|------------|
| Backend | NestJS + TypeScript |
| Frontend | React + TypeScript + Tailwind CSS |
| Base de datos relacional | PostgreSQL + Prisma |
| Base de datos documentos | MongoDB + Mongoose |
| IA | Servicio integrado vía NestJS |
| Archivos | Cloudinary |
| Despliegue | Vercel (optimización máxima) |

---

## 📂 ESTRUCTURA DEL BACKEND

```
src/
├── auth/
│   ├── guards/
│   ├── strategies/
│   ├── dto/
│   ├── users/        ← Perfil, badges, avatar
│   ├── boti/         ← Compañero IA, memoria, mood
│   ├── quests/       ← Motor de misiones
│   ├── verification/ ← Sistema de verificación de evidencia
│   ├── progression/  ← XP y niveles
│   ├── economy/      ← Coins y transacciones
│   ├── shop/         ← Tienda cosmética
│   ├── inventory/    ← Objetos del usuario
│   ├── customization/← Personalización visual
│   ├── achievements/ ← Logros
│   ├── streaks/      ← Rachas diarias
│   ├── ai/           ← Integración IA
│   ├── notifications/← Notificaciones
│   ├── trust/        ← Sistema de confianza
│   ├── diary/        ← Diario de recuerdos
│   ├── friends/      ← Sistema social
│   ├── rankings/     ← Rankings
│   └── collection/   ← Colección de objetos
└── common/
    ├── cloudinary/
    └── mongo/
```

---

## 📋 FASES DE IMPLEMENTACIÓN

| Fase | Módulo | Estado |
|------|--------|--------|
| 1 | Arquitectura base + PostgreSQL + Docker | ✅ |
| 2 | Autenticación (JWT, Google OAuth, Refresh Rotation) | ✅ |
| 3 | Users (perfil, badges, avatar Cloudinary, activity log) | ✅ |
| 4 | Boti (personaje, expresiones, mood dinámico, memoria MongoDB) | ✅ |
| 5 | XP y Niveles (progression) | ⏳ |
| 6 | Misiones (quests) | ⏳ |
| 7 | Verificación de evidencia | ⏳ |
| 8 | Economía (coins) | ⏳ |
| 9 | Tienda + Inventario | ⏳ |
| 10 | Personalización | ⏳ |
| 11 | Logros y Rachas | ⏳ |
| 12 | Sistema de confianza | ⏳ |
| 13 | Diario de recuerdos | ⏳ |
| 14 | IA / Chat con Boti | ⏳ |
| 15 | Amigos y Rankings | ⏳ |
| 16 | Colección | ⏳ |
| 17 | Notificaciones | ⏳ |
| 18 | Panel de administración | ⏳ |
| 19 | PWA y responsive | ⏳ |

---

## 🔑 REGLAS DE PRODUCTO

1. **Haru te hace salir de la app para vivir.**
2. **Boti debe ser divertido, útil y sencillo de entender.**
3. **El RPG apoya la experiencia, no la domina.**
4. **La economía es cosmética/divertida. Sin dinero real.**
5. **La IA se siente integrada al personaje, no es un chatbot separado.**
6. **El usuario tiene control sobre sus datos (GDPR).**
7. **No construir funcionalidades solo porque "sería cool".**
8. **Primero excelente el núcleo.**
9. **No sobreingeniarizar.**
10. **No castigar al usuario por perder una racha.** "No pasa nada 🌱."

---

## 🎯 MVP

### Incluido:
- Auth (registro, login, sesión)
- Boti (personaje, expresiones, personalidad)
- RPG (XP, niveles, monedas)
- Misiones (listado, diaria, aceptar, completar, recompensas)
- Verificación (foto + IA)
- Economía (Coins, saldo, tienda)
- Inventario + Personalización
- Logros + Rachas
- Chat con Boti + IA
- Diario de recuerdos
- Perfil con badges y estadísticas

### No incluido inicialmente:
Combate, enemigos, mundo abierto, mapas complejos, marketplace, pagos reales, criptomonedas, finanzas, red social completa, multijugador, clanes.

---

## 🚀 INSTRUCCIÓN FINAL

Construir Haru de manera incremental. Cada fase debe dejar una funcionalidad real de extremo a extremo.

Cada decisión técnica debe responder:

> **¿Esto hace que Haru sea mejor para el usuario?**

El objetivo no es crear el RPG más grande. El objetivo es crear **la plataforma más divertida y útil para vivir experiencias reales cada día.**
# Haru-Backend
