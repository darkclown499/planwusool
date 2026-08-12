import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';

type EditorLanguage = 'css' | 'javascript' | 'json';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: EditorLanguage;
  height?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = 'css',
  height = '280px',
  readOnly = false,
  placeholder,
}: CodeEditorProps) {
  return (
    <div
      dir="ltr"
      className="overflow-hidden rounded-lg border border-input bg-background text-start"
    >
      <CodeMirror
        value={value}
        height={height}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        extensions={[
          language === 'css' ? css() : language === 'json' ? json() : javascript(),
          EditorView.lineWrapping,
        ]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}

export default CodeEditor;
