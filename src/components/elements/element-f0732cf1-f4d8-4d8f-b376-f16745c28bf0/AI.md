---
name: animated-tabs
description: A customizable tab component with smooth clip-path animation for highlighting the active tab
keywords: tabs, animation, clip-path, segmented control, navigation, ui, component
---

#### Animated Tabs

Properties:
- `tabs`: `Array<{label: string, value: string}>` - Array of tab objects with label and value properties. Default: `[{label: 'Tab 1', value: 'tab1'}, {label: 'Tab 2', value: 'tab2'}, {label: 'Tab 3', value: 'tab3'}]`
- `defaultActiveTab`: `number` - Index of the tab that should be active by default (starting from 0). Default: `0`
- `backgroundColor`: `string` - Background color of the tabs container. Default: `'#f5f5f5'`
- `indicatorColor`: `string` - Color of the active tab indicator. Default: `'#4a90e2'`
- `activeTextColor`: `string` - Text color of the active tab. Default: `'#ffffff'`
- `inactiveTextColor`: `string` - Text color of inactive tabs. Default: `'#333333'`
- `borderRadius`: `string` - Border radius of the tabs container and indicator. Default: `'8px'`
- `padding`: `string` - Internal padding of the tabs container. Default: `'4px'`
- `tabPadding`: `string` - Horizontal padding inside each tab. Default: `'16px'`
- `fontSize`: `string` - Font size of the tab labels. Default: `'14px'`
- `tabHeight`: `string` - Height of the tabs. Default: `'40px'`
- `animationDuration`: `string` - Duration of the tab switching animation. Default: `'0.3s'`

Events:
- `change`: `{index: number, tab: {label: string, value: string}}` - Triggered when a tab is selected
- `workflow`: `{workflowId: string, index: number, tab: {label: string, value: string}}` - Triggered when a tab is selected, includes the workflow ID

Actions:
- `setActiveTab`: Sets the active tab programmatically. Args: index (number)

Variables:
- `selectedTabIndex`: number - The index of the currently selected tab
- `selectedTab`: object - The currently selected tab object with label and value properties

Special features:
- Multilingual support for tab labels
- Smooth clip-path animation with customizable duration
- Responsive design that adapts to container width
- Automatic workflow triggering with specified ID
- Customizable styling including colors, spacing, and text properties