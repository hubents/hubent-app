# ClickUp MCP en este proyecto

Configuración en [`.cursor/mcp.json`](mcp.json): servidor remoto **`clickup-integration`** → `https://mcp.clickup.com/mcp` (oficial [ClickUp MCP](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server)).

## Activar y dar acceso

1. **Reinicia Cursor** o recarga la ventana tras clonar/pull de este archivo.
2. **Cursor** → **Settings** → **Features** → **MCP** (o **Model Context Protocol**).
3. Confirma que aparece **`clickup-integration`** (heredado del proyecto vía `.cursor/mcp.json`).
4. Pulsa **Connect** / **Authenticate** / el flujo que Cursor muestre y completa **OAuth en el navegador**.
5. Elige el workspace (p. ej. **Napsix AI**) cuando ClickUp lo pida.

## OAuth app en ClickUp (solo si te lo pide el flujo)

Cursor usa un redirect fijo para MCP (documentación Cursor):

`cursor://anysphere.cursor-mcp/oauth/callback`

Si creas una app OAuth en ClickUp, añade esa URL en **Redirect URL(s)**. Muchas veces el flujo integrado de Cursor + ClickUp no requiere app propia.

## Nota

- **MCP** = OAuth en el IDE (tareas, listas, comentarios vía herramientas del agente).
- **`CLICKUP_API_TOKEN` en Vercel** = API REST para HubEnts (`@/lib/clickup`, monitoring). Son canales distintos.

Si ya tienes otro `mcp.json` global (`~/.cursor/mcp.json`), fusiona la clave `clickup-integration` dentro de `mcpServers` para no sobrescribir otros servidores.
