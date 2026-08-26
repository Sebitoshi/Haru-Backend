# 🤖 AI / Boti — Agent Rules

> **Antes de trabajar aquí, LEER este archivo.**

---

## 📌 PROPÓSITO

Integración de inteligencia artificial con **Boti**, el compañero de **Haru**.

Responsabilidades:
- Chat conversacional con Boti
- Recomendación de misiones
- Generación de misiones dinámicas
- Análisis de evidencias de verificación
- Personalizar respuestas según contexto

---

## 🏗️ ARQUITECTURA

```
Usuario → React → NestJS API → AI Service → Modelo de IA
                                                    ↓
                                              AI Response
                                                    ↓
                                        NestJS valida y decide
                                                    ↓
                                                React
```

---

## 🧠 MODOS DE BOTI

| Modo | Ejemplo |
|------|---------|
| 🎯 Recomendador | "Tengo una misión que creo que te va a gustar." |
| 🌱 Motivador | "Llevas 6 días seguidos. ¡Uno más!" |
| 🧭 Explorador | "Siempre eliges creatividad. Probemos aventura." |
| 📖 Narrador | "Has recorrido bastante camino. Mira todo lo que has conseguido." |

---

## 🔑 REGLAS CRÍTICAS

1. **La IA PROPOONE, el backend DECIDE.** Nunca al revés.
2. **La IA NUNCA accede directamente a la DB** para acciones críticas.
3. **La IA NUNCA modifica:** monedas, inventario, XP, niveles, auth, permisos.
4. **Las misiones generadas por IA** se validan antes de crear.
5. **Las recompensas las asigna el backend.**
6. **La memoria es estructurada**, no un log libre.
7. **Privacidad es prioridad.**
8. **La IA analiza evidencias** (fotos, texto) para verificación de misiones.
9. **Las respuestas de Boti deben sentirse como el personaje**, no como un chatbot genérico.

---

## 🔄 FLUJO DE MISIÓN GENERADA POR IA

```
Usuario: "Tengo 10 minutos y estoy aburrido"
       ↓
AI Service genera propuesta
       ↓
NestJS valida estructura
       ↓
Backend asigna recompensas (XP, Coins)
       ↓
Se crea la misión en la DB
       ↓
Usuario acepta → flujo normal
```

---

## 📋 ACTUALIZACIONES

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| — | Pendiente de implementar | — |
