<template>
  <div 
    class="email-badge-input" 
    :class="{ 'is-focused': isFocused, 'is-disabled': isDisabled }"
    :style="containerStyle"
    @click="focusInput"
  >
    <div class="badges-container">
      <div 
        v-for="(email, index) in emails" 
        :key="index"
        class="email-badge"
        :class="{ 'is-invalid': !isValidEmail(email) }"
        :style="badgeStyle(email)"
      >
        <span class="badge-text">{{ email }}</span>
        <button 
          v-if="!isDisabled"
          class="badge-remove"
          :style="removeButtonStyle"
          @click.stop="removeEmail(index)"
          type="button"
          aria-label="Remove email"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="email-input"
        :placeholder="emails.length === 0 ? placeholder : ''"
        :disabled="isDisabled"
        :style="inputStyle"
        @keydown="handleKeyDown"
        @blur="handleBlur"
        @focus="handleFocus"
        @paste="handlePaste"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'EmailBadgeInput',
  props: {
    content: {
      type: Object,
      required: true
    },
    uid: {
      type: String,
      required: true
    },
  },
  emits: ['trigger-event'],
  setup(props, { emit }) {
    const isEditing = computed(() => {
      // eslint-disable-next-line no-unreachable
      return false;
    });

    const inputRef = ref(null);
    const inputValue = ref('');
    const isFocused = ref(false);

    const { value: emails, setValue: setEmails } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'emails',
      type: 'array',
      defaultValue: computed(() => props.content?.initialEmails || [])
    });

    const placeholder = computed(() => props.content?.placeholder || 'Enter email addresses...');
    const isDisabled = computed(() => props.content?.isDisabled || false);
    const allowInvalid = computed(() => props.content?.allowInvalid || false);

    const containerStyle = computed(() => ({
      backgroundColor: props.content?.backgroundColor || '#ffffff',
      borderColor: props.content?.borderColor || '#d1d5db',
      borderWidth: props.content?.borderWidth || '1px',
      borderRadius: props.content?.borderRadius || '6px',
      padding: props.content?.padding || '8px',
      minHeight: props.content?.minHeight || '42px',
      opacity: isDisabled.value ? '0.6' : '1',
      cursor: isDisabled.value ? 'not-allowed' : 'text'
    }));

    const inputStyle = computed(() => ({
  color: props.content?.textColor || '#1f2937',
  fontSize: props.content?.fontSize || '14px',
  fontFamily: props.content?.fontFamily || 'inherit',
  padding: props.content?.inputPadding || '4px 8px'
}));


    const badgeStyle = (email) => {
      const isValid = isValidEmail(email);
      return {
        backgroundColor: isValid 
          ? (props.content?.badgeBackgroundColor || '#3b82f6')
          : (props.content?.invalidBadgeBackgroundColor || '#ef4444'),
        color: isValid
          ? (props.content?.badgeTextColor || '#ffffff')
          : (props.content?.invalidBadgeTextColor || '#ffffff'),
        borderRadius: props.content?.badgeRadius || '4px',
        padding: props.content?.badgePadding || '4px 8px',
        fontSize: props.content?.badgeFontSize || '13px'
      };
    };

    const removeButtonStyle = computed(() => ({
      color: props.content?.badgeTextColor || '#ffffff'
    }));

    const isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email?.trim());
    };

    const addEmail = (email) => {
      if (isEditing.value) return;

      const trimmedEmail = email?.trim();
      if (!trimmedEmail) return;

      if (!allowInvalid.value && !isValidEmail(trimmedEmail)) {
        emit('trigger-event', {
          name: 'invalid',
          event: { value: trimmedEmail }
        });
        return;
      }

      if (emails.value?.includes(trimmedEmail)) {
        emit('trigger-event', {
          name: 'duplicate',
          event: { value: trimmedEmail }
        });
        return;
      }

      const newEmails = [...(emails.value || []), trimmedEmail];
      setEmails(newEmails);
      inputValue.value = '';

      emit('trigger-event', {
        name: 'add',
        event: { value: trimmedEmail, emails: newEmails }
      });

      emit('trigger-event', {
        name: 'change',
        event: { value: newEmails }
      });
    };

    const removeEmail = (index) => {
      if (isEditing.value || isDisabled.value) return;

      const removedEmail = emails.value?.[index];
      const newEmails = (emails.value || []).filter((_, i) => i !== index);
      setEmails(newEmails);

      emit('trigger-event', {
        name: 'remove',
        event: { value: removedEmail, emails: newEmails }
      });

      emit('trigger-event', {
        name: 'change',
        event: { value: newEmails }
      });
    };

    const clearAll = () => {
      if (isEditing.value || isDisabled.value) return;

      setEmails([]);
      inputValue.value = '';

      emit('trigger-event', {
        name: 'clear',
        event: { value: [] }
      });

      emit('trigger-event', {
        name: 'change',
        event: { value: [] }
      });
    };

    const handleKeyDown = (event) => {
      if (isDisabled.value) return;

      const triggers = [' ', ',', 'Tab'];
      
      if (triggers.includes(event.key)) {
        event.preventDefault();
        addEmail(inputValue.value);
      } else if (event.key === 'Backspace' && !inputValue.value && emails.value?.length > 0) {
        removeEmail(emails.value.length - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        addEmail(inputValue.value);
      }
    };

    const handleBlur = () => {
      isFocused.value = false;
      if (inputValue.value?.trim()) {
        addEmail(inputValue.value);
      }
      
      emit('trigger-event', {
        name: 'blur',
        event: { value: emails.value }
      });
    };

    const handleFocus = () => {
      isFocused.value = true;
      
      emit('trigger-event', {
        name: 'focus',
        event: { value: emails.value }
      });
    };

    const handlePaste = (event) => {
      if (isDisabled.value) return;

      event.preventDefault();
      const pastedText = event.clipboardData?.getData('text') || '';
      const emailList = pastedText
        .split(/[\s,;]+/)
        .map(email => email.trim())
        .filter(email => email);

      emailList.forEach(email => {
        if (allowInvalid.value || isValidEmail(email)) {
          if (!emails.value?.includes(email)) {
            const newEmails = [...(emails.value || []), email];
            setEmails(newEmails);
          }
        }
      });

      inputValue.value = '';

      emit('trigger-event', {
        name: 'paste',
        event: { value: emailList, emails: emails.value }
      });

      emit('trigger-event', {
        name: 'change',
        event: { value: emails.value }
      });
    };

    const focusInput = () => {
      if (!isDisabled.value && inputRef.value) {
        inputRef.value.focus();
      }
    };

    const setEmailsAction = (newEmails) => {
      if (!Array.isArray(newEmails)) return;
      setEmails(newEmails);
      
      emit('trigger-event', {
        name: 'change',
        event: { value: newEmails }
      });
    };

    const addEmailAction = (email) => {
      addEmail(email);
    };

    watch(() => props.content?.initialEmails, (newInitialEmails) => {
      if (Array.isArray(newInitialEmails)) {
        setEmails(newInitialEmails);
        
        emit('trigger-event', {
          name: 'initValueChange',
          event: { value: newInitialEmails }
        });
      }
    }, { deep: true });

    return {
      inputRef,
      inputValue,
      isFocused,
      emails,
      placeholder,
      isDisabled,
      containerStyle,
      inputStyle,
      badgeStyle,
      removeButtonStyle,
      isValidEmail,
      removeEmail,
      handleKeyDown,
      handleBlur,
      handleFocus,
      handlePaste,
      focusInput,
      clearAll,
      setEmailsAction,
      addEmailAction
    };
  },
  methods: {
    clearAll() {
      this.clearAll();
    },
    setEmails(emails) {
      this.setEmailsAction(emails);
    },
    addEmail(email) {
      this.addEmailAction(email);
    }
  }
};
</script>

<style lang="scss" scoped>
.email-badge-input {
  display: inline-flex;
  width: 100%;
  padding: 6px;
  border-style: solid;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &.is-focused {
    border-color: #3b82f6;
    outline: none;
  }

  &.is-disabled {
    pointer-events: none;
  }
}

.badges-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  width: 100%;
  align-items: center;
  padding: 6px 8px;
}

.email-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-weight: 500;

  &.is-invalid {
    animation: shake 0.3s ease;
  }

  &:hover {
    opacity: 0.9;
  }
}

.badge-text {
  line-height: 1;
}

.badge-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.2s ease;
  line-height: 1;

  &:hover {
    opacity: 0.7;
  }

  &:focus {
    outline: none;
  }
}

.email-input {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  line-height: 1.5;

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
</style>