export default {
    editor: {
        label: 'Input Verification Code',
        icon: 'number',
        bubble: { icon: 'number' },
    },
    options: {
        displayAllowedValues: ['flex', 'inline-flex'],  
    },
    triggerEvents: [
        { name: 'change', label: { en: 'On change' }, event: { value: '' }, default: true },
        { name: 'initValueChange', label: { en: 'On init value change' }, event: { value: '' } },
        { name: 'complete', label: { en: 'On complete' }, event: { value: '' } },
    ],
    properties: {
        input: {
            defaultValue: { isWwObject: true, type: 'deb10a01-5eef-4aa1-9017-1b51c2ad6fd0' },
            hidden: true,
        },
        nbrOfCode: {
            label: 'Number of code',
            type: 'Number',
            section: 'settings',
            defaultValue: 6,
            bindable: true,
        },
    },
};
