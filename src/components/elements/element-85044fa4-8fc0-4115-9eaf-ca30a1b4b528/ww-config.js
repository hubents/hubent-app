export default {
    editor: {
        label: {
            en: 'Date',
        },
        menuOptions: {
            quick: {
                label: {
                    en: 'Edit date',
                    fr: 'Edit date',
                },
                sections: ['date', 'format', 'customFormat', 'doc'],
            },
        },
        icon: 'calendar',
        bubble: {
            icon: 'calendar',
        },
    },
    properties: {
        el: {
            hidden: true,
            defaultValue: { isWwObject: true, type: 'ww-text' },
        },
        date: {
            label: { en: 'Date', fr: 'Date' },
            type: 'Text',
            options: {
                placeholder: 'Date to format',
            },
            bindable: true,
            defaultValue: '2021-03-11T10:11:20.000+00:00',

        },
        format: {
            label: {
                en: 'Format',
                fr: 'Format',
            },
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'DD/MM/YYYY', label: { en: 'DD/MM/YYYY' } },
                    { value: 'MMMM D, YYYY', label: { en: 'MMMM D, YYYY' } },
                    { value: 'MMM D, YYYY', label: { en: 'MMM D, YYYY' } },
                    { value: 'h:mm A', label: { en: 'h:mm A' } },
                    { value: 'h:mm:ss A', label: { en: 'h:mm:ss A' } },
                    {
                        value: 'MMM D, YYYY h:mm A',
                        label: { en: 'MMM D, YYYY h:mm A' },
                    },
                    {
                        value: 'ddd, MMM D, YYYY h:mm A',
                        label: { en: 'ddd, MMM D, YYYY h:mm A' },
                    },
                ],
            },
            defaultValue: 'DD/MM/YYYY',
        },
        customFormat: {
            label: { en: 'Custom Format', fr: 'Custom Format' },
            type: 'Text',
            options: {
                placeholder: 'MMMM D, YYYY h:mm A',
            },
            defaultValue: '',
        },
        doc: {
            type: 'Button',
            label: null,
            editorOnly: true,
            options: {
                text: {
                    en: 'Date documentation',
                },
                action: 'goToDoc',
            },
        },
    },
};
