---
name: ww-stack
description: Draggable and sortable stack component for organizing collections of items in a ww-kanban.
keywords: stack, draggable, sortable, collection, list, reorder
---

#### ww-stack

***Purpose:***
A draggable and sortable stack component based on vuedraggable that manages collections of items with reordering capabilities.

***Features:***
- Built using vuedraggable for drag-and-drop functionality
- IMPORTANT: Contents are structured with header, item, and footer sections
- Uses internal tracking of dragging state with the `isDragging` variable
- Can be set to readonly mode to disable drag-and-drop functionality
- Maintains item grouping for drag-and-drop between different stacks with the same group

***Properties:***
- readonly: Boolean to make the stack read-only (disables drag functionality). Default: false
- itemKey: String that specifies the property to use as unique key for items. Default: "id"

***Events:***
- item:moved: Triggered when an item is moved within the stack. Event data includes:
  => item: The moved item
  => oldIndex: Index before moving
  => newIndex: Index after moving
  => updatedList: Full updated list after the move
- item:added: Triggered when an item is added to the stack. Event data includes:
  => item: The added item
  => newIndex: Index where item was added
  => updatedList: Full updated list after addition
- item:removed: Triggered when an item is removed from the stack. Event data includes:
  => item: The removed item
  => oldIndex: Index from which item was removed
  => updatedList: Full updated list after removal

***States:***
- **readonly**: Applied when the stack is in readonly mode (can't reorder items)
- **isDragging**: Boolean variable that tracks if dragging is in progress

***Slots:***
- **itemElement**: Template for each item in the stack (receives item data and index)
- **headerElement**: Content displayed at the top of the stack.
- **footerElement**: Content displayed at the bottom of the stack.

***Notes:***
- The component fixes pointer events for proper touch dragging on mobile/tablet
