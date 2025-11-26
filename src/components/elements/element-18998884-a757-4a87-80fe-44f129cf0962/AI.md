---
name: ww-kanban
description: Kanban board for organizing items into categorized stacks with drag-and-drop functionality. This component requires the ww-stack component. Include ww-stack in the documentation if ww-kanban is required.
keywords: kanban, board, draggable, sortable, stacks, cards, tasks, organization
---

#### ww-kanban

***Purpose:***
A Kanban board component that organizes items into movable stacks with drag-and-drop functionality. To create one use the example below.

***Features:***
- Display must be one of: `flex` or `inline-flex`
- Items must be bound to an array of objects
- Stacks can be defined manually or through data binding
- Items can be sorted within stacks and moved between stacks
- Default stacks: Todo, In Progress, Done
- Supports an "Uncategorized" stack for items without a stack value
- Drag-and-drop can be customized with cursor style and drag handles

***Properties:***
- `items`: Array of objects to display in the Kanban board (bindable)
- `stacks`: Array of stack objects with label and value properties (bindable)
- `stackedBy`: Property path of the item that determines its stack
- `sortedBy`: Property path to sort items within stacks
- `sortOrder`: Sort direction - "asc" or "desc" (default: "asc")
- `itemKey`: Unique identifier property path for items
- `wrapStacks`: Whether stacks should wrap to new rows (default: true)
- `uncategorizedStack`: Show a stack for items without a stack value (default: false)
- `sortable`: Enable drag-and-drop sorting (default: true)
- `readonly`: Disable all drag-and-drop functionality (default: false)
- `draggingCursor`: Cursor style while dragging (default: "grabbing")
- `customDragHandle`: Use a custom element as drag handle (default: false)
- `handleClass`: CSS class for custom drag handles (default: "draggable")

***Events***:
- `item:moved`: Triggered when an item is moved within or between stacks
  - Event data:
    => `item`: The moved item object
    => `from`: Source stack value
    => `to`: Destination stack value 
    => `oldIndex`: Original position index
    => `newIndex`: New position index
    => `updatedList`: Updated array of items

***Exposed Variables:***
- `isDragging`: Boolean indicating if an item is currently being dragged

***Slots:***
- `stackElement`: ww-stack component used to render each stack in the kanban board.
