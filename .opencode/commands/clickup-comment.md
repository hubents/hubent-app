---
description: Comenta una task ClickUp con formato NapsixAI y la mueve a review
agent: build
---

Postea un comentario en una task ClickUp con el formato estándar NapsixAI y, opcionalmente, mueve la task a `review`.

Argumentos:
- `$1` = ID de la task (formato `86afx36wc` o el ID interno)
- `$ARGUMENTS` = el resto del mensaje (resumen libre del trabajo)

Pasos:

1. Carga el skill `clickup-integration` para tener el formato exacto
2. Construye el comentario en Node (NUNCA en PowerShell — UTF-8/emojis fallan):
   - 📋 Título corto
   - 🔴 Antes (problema) con bullets •
   - ✅ Después (solución) con bullets •
   - 🚀 Deploy si aplica (commit hash + URL)
   - 📁 Archivos en una línea
   - Firma `—` + salto + `NapsixAI`
3. Llama `addClickUpTaskComment(taskId, text)` desde un script tsx temporal o desde el código del proyecto
4. Pregunta al usuario si quiere mover la task a `review` (NO `complete` por iniciativa propia). Si sí: `updateClickUpTask(taskId, { status: "review" })`
5. NUNCA cerrar (mover a `complete`) sin instrucción explícita del usuario

Si `CLICKUP_API_TOKEN` no está disponible localmente, advertir al usuario y abortar — no pedir el token.
