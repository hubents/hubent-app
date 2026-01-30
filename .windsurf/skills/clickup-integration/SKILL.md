# ClickUp Integration Skill

## Descripcion
Guia para integrar y usar ClickUp en proyectos NapsixAI para gestion de tareas y proyectos.

## Configuracion

### Variables de Entorno (Vercel)
```bash
CLICKUP_API_TOKEN="168164076_2b5016ad69c83a23f3ea96a29e33831f6a4f7522588dbd90e2f113dbb9d9afda"
CLICKUP_TEAM_ID="90132561531"
CLICKUP_CLIENT_ID="56YR98NI1TFQQ3G09EUDBDXY2IAQX1HA"
CLICKUP_CLIENT_SECRET="C67OSBVRTJ5K7BWL37AWDR5LF2KMDQOXS40YQS0ZK08QNV56772L7K5VWXWUHZ1T"
```

### IDs del Workspace NapsixAI
- **Team ID:** `90132561531` (compartido entre todos los proyectos)

## Enviar comentarios con emojis

**IMPORTANTE:** Usar Node.js para enviar comentarios con emojis (PowerShell no maneja bien UTF-8).

### Script ejemplo:
```javascript
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;

async function addComment(taskId, commentText) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
    method: 'POST',
    headers: {
      'Authorization': CLICKUP_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment_text: commentText }),
  });
  return response.json();
}

// Ejemplo de uso
const comment = `# 🚀 Reporte de Tarea

## 📊 Estado
| Item | Estado |
|------|--------|
| Feature | ✅ Completado |
| Tests | ✅ Pasando |

---
🤖 *Comentario agregado por NapsixAI*`;

await addComment('TASK_ID', comment);
```

## Branding en tareas automaticas

**SIEMPRE usar "NapsixAI"** en comentarios y descripciones:

**Para descripciones de tareas:**
```
---
*Tarea creada automaticamente por NapsixAI*
```

**Para comentarios:**
```
---
🤖 *Comentario agregado por NapsixAI*
```

**NO usar:** Cascade, Windsurf, u otros nombres de herramientas.

## Formato recomendado para reportes

```markdown
# 🚀 Titulo del Reporte

## 📊 Dashboard de Estado
| Componente | Estado | Cobertura |
|------------|--------|-----------|
| Feature A | ✅ Operativo | 100% |
| Feature B | ⏳ Pendiente | 50% |

## ✅ Checklist
- [x] Item completado
- [ ] Item pendiente

---
🤖 *Reporte generado por NapsixAI*
📅 Fecha y hora
```

## Notas

- El token de API no expira
- El Team ID es compartido entre proyectos NapsixAI
- Usar Node.js para emojis (no PowerShell/curl)
