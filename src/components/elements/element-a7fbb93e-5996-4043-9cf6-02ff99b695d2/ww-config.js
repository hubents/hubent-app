export default {
  editor: {
    label: {
      en: 'Email Badge Input'
    },
    icon: 'mail'
  },
  properties: {
    initialEmails: {
      label: {
        en: 'Initial emails'
      },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(_, index) {
          return `Email ${index + 1}`;
        },
        item: {
          type: 'Text',
          defaultValue: ''
        }
      },
    },
    placeholder: {
      label: {
        en: 'Placeholder'
      },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'Enter email addresses...',
    },
    isDisabled: {
      label: {
        en: 'Disabled'
      },
      type: 'OnOff',
      section: 'settings',
      bindable: true,
      defaultValue: false,
    },
    allowInvalid: {
      label: {
        en: 'Allow invalid emails'
      },
      type: 'OnOff',
      section: 'settings',
      bindable: true,
      defaultValue: false,
    },
    backgroundColor: {
      label: {
        en: 'Background color'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#ffffff',
      options: {
        nullable: true
      },
    },
    borderColor: {
      label: {
        en: 'Border color'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#d1d5db',
      options: {
        nullable: true
      },
    },
    borderWidth: {
      label: {
        en: 'Border width'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '1px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 0, max: 10 }
        ]
      },
    },
    borderRadius: {
      label: {
        en: 'Border radius'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '6px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 0, max: 50 }
        ]
      },
    },
    padding: {
      label: {
        en: 'Padding'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '8px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 0, max: 50 }
        ]
      },
    },
    minHeight: {
      label: {
        en: 'Min height'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '42px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 20, max: 200 }
        ]
      },
    },
    textColor: {
      label: {
        en: 'Text color'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#1f2937',
      options: {
        nullable: true
      },
    },
    fontSize: {
      label: {
        en: 'Font size'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '14px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 8, max: 32 }
        ]
      },
    },
    fontFamily: {
      label: {
        en: 'Font family'
      },
      type: 'FontFamily',
      section: 'style',
      bindable: true,
    },
    badgeBackgroundColor: {
      label: {
        en: 'Badge background'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#3b82f6',
      options: {
        nullable: true
      },
    },
    badgeTextColor: {
      label: {
        en: 'Badge text color'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#ffffff',
      options: {
        nullable: true
      },
    },
    invalidBadgeBackgroundColor: {
      label: {
        en: 'Invalid badge background'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#ef4444',
      options: {
        nullable: true
      },
    },
    invalidBadgeTextColor: {
      label: {
        en: 'Invalid badge text color'
      },
      type: 'Color',
      section: 'style',
      bindable: true,
      defaultValue: '#ffffff',
      options: {
        nullable: true
      },
    },
    badgeRadius: {
      label: {
        en: 'Badge radius'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '4px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 0, max: 20 }
        ]
      },
    },
    inputPadding: {
  label: { en: 'Input padding' },
  type: 'Text',
  section: 'style',
  bindable: true,
  defaultValue: '4px 8px'
}, 
    badgePadding: {
      label: {
        en: 'Badge padding'
      },
      type: 'Text',
      section: 'style',
      bindable: true,
      defaultValue: '4px 8px',
    },
    badgeFontSize: {
      label: {
        en: 'Badge font size'
      },
      type: 'Length',
      section: 'style',
      bindable: true,
      defaultValue: '13px',
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 8, max: 24 }
        ]
      },
    }
  },
  triggerEvents: [
    {
      name: 'change',
      label: { en: 'On change' },
      event: { value: [] },
      default: true
    },
    {
      name: 'add',
      label: { en: 'On email added' },
      event: { value: '', emails: [] }
    },
    {
      name: 'remove',
      label: { en: 'On email removed' },
      event: { value: '', emails: [] }
    },
    {
      name: 'clear',
      label: { en: 'On clear all' },
      event: { value: [] }
    },
    {
      name: 'invalid',
      label: { en: 'On invalid email' },
      event: { value: '' }
    },
    {
      name: 'duplicate',
      label: { en: 'On duplicate email' },
      event: { value: '' }
    },
    {
      name: 'focus',
      label: { en: 'On focus' },
      event: { value: [] }
    },
    {
      name: 'blur',
      label: { en: 'On blur' },
      event: { value: [] }
    },
    {
      name: 'paste',
      label: { en: 'On paste' },
      event: { value: [], emails: [] }
    },
    {
      name: 'initValueChange',
      label: { en: 'On initial value change' },
      event: { value: [] }
    }
  ],
  actions: [
    {
      label: { en: 'Clear all emails' },
      action: 'clearAll'
    },
    {
      label: { en: 'Set emails' },
      action: 'setEmails',
      args: [
        {
          name: 'emails',
          type: 'array',
          label: { en: 'Email array' }
        }
      ]
    },
    {
      label: { en: 'Add email' },
      action: 'addEmail',
      args: [
        {
          name: 'email',
          type: 'string',
          label: { en: 'Email address' }
        }
      ]
    }
  ]
};