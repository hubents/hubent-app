---
name: Email Badge Input
description: A specialized input component that transforms email addresses into removable badges as users type, with automatic validation and array exposure for seamless form integration.
keywords: email, input, badge, tag, validation, form, multi-email, chip, token
---

#### Email Badge Input

***Purpose:***
Provides an intuitive interface for collecting multiple email addresses by automatically converting typed emails into visual badges when users press space, comma, or tab. Invalid emails are highlighted in red, and all emails are exposed as an array for easy integration with workflows and forms.

***Features:***
- Automatic badge creation on space, comma, or tab key press
- Real-time email validation with visual feedback
- Individual badge removal with click interaction
- Paste support for multiple emails at once
- Backspace to remove last badge when input is empty
- Customizable styling for valid and invalid badges
- Disabled state support
- Option to allow invalid email formats

***Properties:***
- initialEmails: array - Initial list of email addresses to display as badges: `["user@example.com", "admin@site.com"]`
- placeholder: string - Placeholder text shown when no emails are entered: `"Enter email addresses..."`
- isDisabled: boolean - Disables all interactions when true
- allowInvalid: boolean - When true, allows adding emails that don't match standard format (still highlighted as invalid)
- backgroundColor: string - Background color of the input container
- borderColor: string - Border color of the input container
- borderWidth: string - Width of the container border: `"1px"`
- borderRadius: string - Roundness of container corners: `"6px"`
- padding: string - Internal spacing of the container: `"8px"`
- minHeight: string - Minimum height of the container: `"42px"`
- textColor: string - Color of the input text
- fontSize: string - Size of the input text: `"14px"`
- fontFamily: string - Font family for the input text
- badgeBackgroundColor: string - Background color for valid email badges: `"#3b82f6"`
- badgeTextColor: string - Text color for valid email badges: `"#ffffff"`
- invalidBadgeBackgroundColor: string - Background color for invalid email badges: `"#ef4444"`
- invalidBadgeTextColor: string - Text color for invalid email badges: `"#ffffff"`
- badgeRadius: string - Roundness of badge corners: `"4px"`
- badgePadding: string - Internal spacing of badges: `"4px 8px"`
- badgeFontSize: string - Font size of badge text: `"13px"`

***Events:***
- change: Triggered when the email list changes. Payload: `{ "value": ["email1@example.com", "email2@example.com"] }`
- add: Triggered when an email is added. Payload: `{ "value": "new@example.com", "emails": ["email1@example.com", "new@example.com"] }`
- remove: Triggered when an email is removed. Payload: `{ "value": "removed@example.com", "emails": ["remaining@example.com"] }`
- clear: Triggered when all emails are cleared. Payload: `{ "value": [] }`
- invalid: Triggered when user tries to add an invalid email (only when allowInvalid is false). Payload: `{ "value": "invalid-email" }`
- duplicate: Triggered when user tries to add an email that already exists. Payload: `{ "value": "duplicate@example.com" }`
- focus: Triggered when the input receives focus. Payload: `{ "value": ["current@emails.com"] }`
- blur: Triggered when the input loses focus. Payload: `{ "value": ["current@emails.com"] }`
- paste: Triggered when emails are pasted. Payload: `{ "value": ["pasted1@example.com", "pasted2@example.com"], "emails": ["all@emails.com"] }`
- initValueChange: Triggered when the initialEmails property changes. Payload: `{ "value": ["new@initial.com"] }`

***Exposed Actions:***
- `clearAll`: Removes all email badges and clears the input. No arguments.
- `setEmails`: Replaces all current emails with a new array. Args: emails (array of strings)
- `addEmail`: Programmatically adds a single email address. Args: email (string)

***Exposed Variables:***
- emails: Array of all current email addresses as strings. (path: variables['uid-emails'])

***Notes:***
- Email validation uses standard regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- When pasting multiple emails, they can be separated by spaces, commas, or semicolons
- Pressing Enter also adds the current email (same as space, comma, or tab)
- Invalid emails are visually distinguished with red styling but can be allowed if `allowInvalid` is enabled
- The component automatically trims whitespace from email addresses
- Duplicate emails are prevented and trigger a duplicate event
- All interactions are disabled in edit mode for better editor experience