# Manual de Usuario: Lista de Invitados

## Índice

1. [Acceso al Módulo](#acceso-al-módulo)
2. [Panel de Estadísticas](#panel-de-estadísticas)
3. [Gestión de Invitados](#gestión-de-invitados)
4. [Vistas: Lista vs Plano](#vistas-lista-vs-plano)
5. [Canvas de Mesas (Plano)](#canvas-de-mesas-plano)
6. [Importar/Exportar CSV](#importarexportar-csv)
7. [Grupos de Invitados](#grupos-de-invitados)
8. [APIs Disponibles](#apis-disponibles)

---

## Acceso al Módulo

1. Ingresa al dashboard de tu evento
2. En el menú lateral, haz clic en **"Lista de Invitados"**
3. Verás el panel principal con estadísticas y la lista de invitados

---

## Panel de Estadísticas

En la parte superior encontrarás 4 tarjetas con métricas en tiempo real:

| Tarjeta | Descripción |
|---------|-------------|
| **Total** | Cantidad total de invitados registrados |
| **Confirmados** | Invitados con RSVP confirmado (verde) |
| **Pendientes** | Invitados sin respuesta (amarillo) |
| **Cancelados** | Invitados que declinaron (rojo) |

---

## Gestión de Invitados

### Agregar Invitado

1. Clic en el botón **"+ Añadir Invitado"** (esquina superior derecha)
2. Completa el formulario:
   - **Nombre** (obligatorio)
   - **Apellido**
   - **Email**
   - **Teléfono**
   - **Menú** (Regular, Vegetariano, Vegano, Celíaco, Infantil)
   - **Grupo** (familia, amigos, trabajo, etc.)
3. Clic en **"Agregar"**

### Editar Estado RSVP

Cada invitado tiene un dropdown de estado en su fila:
- **Confirmada** → El invitado asistirá
- **Pendiente** → Esperando respuesta
- **Cancelada** → El invitado no asistirá

### Asignar Menú

En la fila del invitado, usa el dropdown **"Menú"** para seleccionar:
- Regular
- Vegetariano
- Vegano
- Celíaco
- Infantil

### Asignar Mesa

En la fila del invitado, usa el dropdown **"Mesa"** para asignar a una mesa existente. Muestra la capacidad actual (ej: "Mesa 1 (3/8)").

### Buscar Invitados

Usa la barra de búsqueda para filtrar por nombre, apellido o email.

### Filtrar por Estado

Usa el dropdown **"Todos"** para filtrar:
- Todos
- Confirmados
- Pendientes
- Cancelados

---

## Vistas: Lista vs Plano

En la esquina superior derecha de la lista encontrarás dos botones:

| Botón | Vista |
|-------|-------|
| **Lista** | Vista tradicional en tabla con todos los invitados |
| **Plano** | Vista de canvas interactivo con mesas y asignación visual |

---

## Canvas de Mesas (Plano)

### Crear Mesa

1. Cambia a vista **"Plano"**
2. Clic en **"+ Añadir Mesa"**
3. Selecciona el tipo:
   - **Redonda (8)** - Mesa circular para 8 personas
   - **Redonda (10)** - Mesa circular para 10 personas
   - **Rectangular (8)** - Mesa rectangular para 8 personas
   - **Presidencial (12)** - Mesa larga para 12 personas
4. La mesa aparecerá en el canvas

### Mover Mesas

- Arrastra cualquier mesa para reposicionarla
- La posición se guarda automáticamente

### Asignar Invitados a Mesas

**Desde el Sidebar (izquierda):**
1. En el panel "Sin mesa asignada" verás los invitados sin mesa
2. Haz clic en un invitado para seleccionarlo
3. Aparecerá un dropdown "Asignar a mesa"
4. Selecciona la mesa deseada
5. El invitado se asignará automáticamente

**Desde la Vista Lista:**
1. En la fila del invitado, usa el dropdown "Mesa"
2. Selecciona la mesa deseada

### Visualización de Mesas

Cada mesa muestra:
- **Nombre** (ej: "Mesa 1")
- **Capacidad** (ej: "3/8" = 3 ocupados de 8 lugares)
- **Iniciales** de los invitados asignados

### Controles del Canvas

- **Zoom:** Usa la rueda del mouse o los controles +/-
- **Pan:** Arrastra el fondo para mover la vista
- **Minimap:** En la esquina inferior derecha para navegación rápida

---

## Importar/Exportar CSV

### Importar Invitados desde CSV

1. Clic en **"Importar CSV"**
2. Arrastra un archivo CSV o haz clic para seleccionar
3. El sistema procesará el archivo
4. Verás un resumen: "X invitados importados, Y omitidos"

**Formato del CSV:**

```csv
nombre,apellido,email,telefono,grupo,menu
Juan,Pérez,juan@email.com,1155551234,Familia,regular
María,García,maria@email.com,1155555678,Amigos,vegetariano
```

**Columnas soportadas:**
| Columna CSV | Alternativas aceptadas |
|-------------|------------------------|
| nombre | firstname, first_name, name |
| apellido | lastname, last_name |
| email | correo, mail |
| telefono | phone, tel, celular |
| grupo | group, mesa, table |
| menu | menupreference, dieta |
| edad | agegroup, age_group, tipo |
| notas | notes, observaciones |

### Exportar a CSV

1. Clic en **"Exportar CSV"**
2. Se descargará un archivo con todos los invitados

---

## Grupos de Invitados

### Crear Grupo

1. Clic en **"+ Grupo"**
2. Ingresa el nombre del grupo (ej: "Familia Novia", "Compañeros Trabajo")
3. Clic en **"Crear Grupo"**

### Asignar Invitado a Grupo

Al agregar o editar un invitado, selecciona el grupo en el campo correspondiente.

### Ver por Grupos

En la vista Lista, los invitados se agrupan visualmente por su grupo asignado.

---

## APIs Disponibles

### Invitados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/events/{eventId}/guests` | Listar invitados |
| POST | `/api/events/{eventId}/guests` | Crear invitado |
| PATCH | `/api/events/{eventId}/guests/{guestId}` | Actualizar invitado |
| DELETE | `/api/events/{eventId}/guests/{guestId}` | Eliminar invitado |
| POST | `/api/events/{eventId}/guests/import` | Importar CSV |
| GET | `/api/events/{eventId}/guests/export` | Exportar CSV |
| GET | `/api/events/{eventId}/guests/menu-report` | Reporte de menús |

### Mesas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/events/{eventId}/tables` | Listar mesas |
| POST | `/api/events/{eventId}/tables` | Crear mesa |
| PATCH | `/api/events/{eventId}/tables/{tableId}` | Actualizar mesa |
| DELETE | `/api/events/{eventId}/tables/{tableId}` | Eliminar mesa |
| POST | `/api/events/{eventId}/tables/{tableId}/assign` | Asignar invitado |
| DELETE | `/api/events/{eventId}/tables/{tableId}/assign` | Quitar invitado |

### Check-in

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/events/{eventId}/guests/{guestId}/checkin` | Registrar check-in |

---

## Tips y Mejores Prácticas

1. **Importa primero:** Si tienes una lista existente, usa la importación CSV antes de agregar manualmente.

2. **Organiza por grupos:** Crea grupos lógicos (Familia Novio, Familia Novia, Amigos, Trabajo) para facilitar la organización.

3. **Usa el canvas para mesas:** La vista de plano te permite visualizar la distribución y capacidad de cada mesa.

4. **Revisa los menús:** Antes del evento, exporta el reporte de menús para coordinar con el catering.

5. **Confirma asistencia:** Mantén actualizado el estado RSVP para tener números precisos.

---

## Soporte

Si tienes dudas o problemas con el módulo de Lista de Invitados, contacta al equipo de soporte de HubEnts.

---

*Última actualización: Enero 2026*
