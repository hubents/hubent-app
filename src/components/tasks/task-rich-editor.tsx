"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  RiBold,
  RiItalic,
  RiUnderline,
  RiStrikethrough,
  RiListUnordered,
  RiListOrdered,
  RiCheckboxLine,
  RiLink,
} from "@remixicon/react";

interface TaskRichEditorProps {
  content: string;
  onSave: (content: string) => Promise<unknown>;
}

export function TaskRichEditor({ content, onSave }: TaskRichEditorProps) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setHasChanges(newValue !== content);
  }, [content]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = prefix) => {
    const textarea = document.querySelector('textarea[data-rich-editor]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    
    handleChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertList = (type: 'bullet' | 'number' | 'checkbox') => {
    const textarea = document.querySelector('textarea[data-rich-editor]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    let prefix = '';
    switch (type) {
      case 'bullet':
        prefix = '• ';
        break;
      case 'number':
        prefix = '1. ';
        break;
      case 'checkbox':
        prefix = '☐ ';
        break;
    }

    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    handleChange(newText);
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border border-border rounded-lg bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertMarkdown('**')}
          title="Negrita"
        >
          <RiBold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertMarkdown('*')}
          title="Cursiva"
        >
          <RiItalic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertMarkdown('__')}
          title="Subrayado"
        >
          <RiUnderline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertMarkdown('~~')}
          title="Tachado"
        >
          <RiStrikethrough className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertList('bullet')}
          title="Lista"
        >
          <RiListUnordered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertList('number')}
          title="Lista numerada"
        >
          <RiListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertList('checkbox')}
          title="Checkbox"
        >
          <RiCheckboxLine className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertMarkdown('[', '](url)')}
          title="Enlace"
        >
          <RiLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <Textarea
        data-rich-editor
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe la descripción de la tarea..."
        className="min-h-[150px] font-mono text-sm"
      />

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}
