export default {
    editor: {
        label: {
            en: 'Perfect Grid'
        },
        icon: 'view-grid'
    },
    properties: {
        cellSize: {
            label: { en: 'Cell Size' },
            type: 'Length',
            section: 'settings',
            bindable: true,
            defaultValue: '50px',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 20, max: 200 }
                ]
            },
        },
        gap: {
            label: { en: 'Gap' },
            type: 'Length',
            section: 'settings',
            bindable: true,
            defaultValue: '4px',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 50 }
                ]
            },
        },
        idleColor: {
            label: { en: 'Idle Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            defaultValue: '#e0e0e0',
        },
        activeColor: {
            label: { en: 'Active Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            defaultValue: '#4CAF50',
        },
        animationSpeed: {
            label: { en: 'Animation Speed' },
            type: 'Number',
            section: 'settings',
            bindable: true,
            defaultValue: 300,
            options: {
                min: 100,
                max: 2000,
                step: 100
            },
        }
    },
    triggerEvents: [
        {
            name: 'cellClick',
            label: { en: 'On cell click' },
            event: { row: 0, col: 0 }
        }
    ],
    actions: [
        {
            name: 'resetGrid',
            label: { en: 'Reset grid' }
        }
    ]
};