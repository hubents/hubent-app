// Archivo 1: Configuración del componente
export default {
  editor: {
    label: {
      en: 'Animated Tabs',
    },
    icon: 'menu',
  },
  properties: {
    tabs: {
      label: { en: 'Tabs' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [
        { label: 'Tab 1', value: 'tab1' },
        { label: 'Tab 2', value: 'tab2' },
        { label: 'Tab 3', value: 'tab3' }
      ],
      options: {
        expandable: true,
        getItemLabel(item) {
          return item.label || `Tab ${item.value || ''}`;
        },
        item: {
          type: 'Object',
          defaultValue: {
            label: 'New Tab',
            value: ''
          },
          options: {
            item: {
              label: {
                label: { en: 'Label' },
                type: 'Text',
                options: { placeholder: 'Tab label' },
                multiLang: true
              },
              value: {
                label: { en: 'Value' },
                type: 'Text',
                options: { placeholder: 'tab-value' }
              }
            }
          }
        }
      },
      bindingValidation: {
        type: 'array',
        tooltip: 'Bind to an array of tab objects with label and value properties',
      },
      propertyHelp: {
        tooltip: 'Define the tabs to display. Each tab should have a label and value.',
      },
    },
    defaultActiveTab: {
      label: { en: 'Default Active Tab' },
      type: 'Number',
      section: 'settings',
      bindable: true,
      defaultValue: 0,
      options: {
        min: 0,
        max: 100,
        step: 1
      },
      bindingValidation: {
        type: 'number',
        tooltip: 'Bind to a number representing the index of the default active tab',
      },
      propertyHelp: {
        tooltip: 'The index of the tab that should be active by default (starting from 0)',
      },
    },
    backgroundColor: {
      label: { en: 'Background Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#f5f5f5',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a color value',
      },
      propertyHelp: {
        tooltip: 'The background color of the tabs container',
      },
    },
    indicatorColor: {
      label: { en: 'Indicator Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#4a90e2',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a color value',
      },
      propertyHelp: {
        tooltip: 'The color of the active tab indicator',
      },
    },
    activeTextColor: {
      label: { en: 'Active Text Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#ffffff',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a color value',
      },
      propertyHelp: {
        tooltip: 'The text color of the active tab',
      },
    },
    inactiveTextColor: {
      label: { en: 'Inactive Text Color' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#333333',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a color value',
      },
      propertyHelp: {
        tooltip: 'The text color of inactive tabs',
      },
    },
    borderRadius: {
      label: { en: 'Border Radius' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '8px',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a CSS length value (e.g., "8px")',
      },
      propertyHelp: {
        tooltip: 'The border radius of the tabs container and indicator',
      },
    },
    padding: {
      label: { en: 'Container Padding' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '4px',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a CSS length value (e.g., "4px")',
      },
      propertyHelp: {
        tooltip: 'The internal padding of the tabs container',
      },
    },
    tabPadding: {
      label: { en: 'Tab Padding' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '16px',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a CSS length value (e.g., "16px")',
      },
      propertyHelp: {
        tooltip: 'The horizontal padding inside each tab',
      },
    },
    fontSize: {
      label: { en: 'Font Size' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '14px',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a CSS length value (e.g., "14px")',
      },
      propertyHelp: {
        tooltip: 'The font size of the tab labels',
      },
    },
    tabHeight: {
      label: { en: 'Tab Height' },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '40px',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a CSS length value (e.g., "40px")',
      },
      propertyHelp: {
        tooltip: 'The height of the tabs',
      },
    },
    animationDuration: {
      label: { en: 'Animation Duration' },
      type: 'Text',
      section: 'style',
      bindable: true,
      defaultValue: '0.3s',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a CSS time value (e.g., "0.3s")',
      },
      propertyHelp: {
        tooltip: 'The duration of the tab switching animation',
      },
    },
    fullWidthTabs: {
      label: { en: 'Full Width Tabs' },
      type: 'Boolean',
      section: 'style',
      bindable: true,
      defaultValue: false,
      bindingValidation: {
        type: 'boolean',
        tooltip: 'Bind to a boolean to enable full width tabs',
      },
      propertyHelp: {
        tooltip: 'When enabled, tabs fill the available width equally',
      },
    },
    fontFamily: {
      label: { en: 'Font Family' },
      type: 'Text',
      section: 'style',
      bindable: true,
      defaultValue: 'Inter,-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string for the CSS font-family',
      },
      propertyHelp: {
        tooltip: 'The font-family for tab labels',
      },
    },
    activeTabShadow: {
      label: { en: 'Active Tab Shadow' },
      type: 'Text',
      section: 'style',
      bindable: true,
      defaultValue: '',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string for CSS box-shadow',
      },
      propertyHelp: {
        tooltip: 'The box-shadow for the active tab',
      },
    },
    tabsContainerBackground: {
      label: { en: 'Tabs Container Background' },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#000000',
      bindingValidation: {
        type: 'string',
        tooltip: 'Bind to a string representing a color',
      },
      propertyHelp: {
        tooltip: 'The background color for the tabs container',
      },
    }
  },
  triggerEvents: [
    {
      name: 'change',
      label: { en: 'On tab change' },
      event: {
        index: 0,
        tab: { label: 'Tab 1', value: 'tab1' }
      }
    },
    {
      name: 'workflow',
      label: { en: 'On workflow trigger' },
      event: {
        workflowId: '1dbc3ffc-3376-4ba4-882b-7b764d0c7a10',
        index: 0,
        tab: { label: 'Tab 1', value: 'tab1' }
      }
    }
  ],
  actions: [
    {
      action: 'setActiveTab',
      label: { en: 'Set active tab' },
      args: [
        {
          name: 'index',
          type: 'number',
          label: { en: 'Tab index' }
        }
      ]
    }
  ]
};