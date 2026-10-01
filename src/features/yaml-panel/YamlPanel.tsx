/**
 * YamlPanel — live, editable view of the invoice YAML.
 *
 * Two-way sync: form edits flow in via the store's yamlText; typing here
 * dispatches SET_YAML_TEXT (debounced). Invalid YAML keeps the last valid
 * invoice in the form and lists errors with clickable line numbers.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useInvoice } from '../../state/store';
import { toYaml } from '../../domain';
import { Button } from '../../ui';
import './YamlPanel.css';

const SYNC_DELAY = 300; // ms

export function YamlPanel() {
  const { invoice, yamlText, yamlErrors, dispatch } = useInvoice();
  const [text, setText] = useState(yamlText);
  const [status, setStatus] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror store changes (form edits, load, new) unless the user has a pending edit.
  useEffect(() => {
    if (debounceRef.current === null) setText(yamlText);
  }, [yamlText]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const scheduleSync = useCallback(
    (next: string) => {
      setText(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        dispatch({ type: 'SET_YAML_TEXT', text: next });
      }, SYNC_DELAY);
    },
    [dispatch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts two spaces; Escape releases focus so Tab can leave the editor.
      if (e.key === 'Escape') {
        e.currentTarget.blur();
        return;
      }
      if (e.key !== 'Tab' || e.shiftKey) return;
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: start, selectionEnd: end } = el;
      scheduleSync(text.slice(0, start) + '  ' + text.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
    },
    [text, scheduleSync],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setStatus('YAML copied to clipboard'))
      .catch(() => setStatus('Copy failed'));
  }, [text]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.number || 'invoice'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [text, invoice.number]);

  /** Discard invalid edits and restore the YAML of the last valid invoice. */
  const handleRevert = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    const valid = toYaml(invoice);
    setText(valid);
    dispatch({ type: 'SET_YAML_TEXT', text: valid });
    setStatus('Reverted to last valid YAML');
  }, [invoice, dispatch]);

  const jumpToLine = useCallback(
    (line: number) => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = text.split('\n').slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
      el.focus();
      el.setSelectionRange(pos, pos);
    },
    [text],
  );

  const errorLines = new Set(yamlErrors.map((e) => e.line).filter(Boolean));
  const lineCount = text.split('\n').length;
  const hasErrors = yamlErrors.length > 0;

  return (
    <div className="yaml-panel">
      <div className="yaml-panel__toolbar" role="toolbar" aria-label="YAML actions">
        <Button variant="secondary" size="sm" onClick={handleCopy}>Copy</Button>
        <Button variant="secondary" size="sm" onClick={handleDownload}>Download .yaml</Button>
        <Button variant="secondary" size="sm" onClick={handleRevert} disabled={!hasErrors}>
          Revert to last valid
        </Button>
      </div>

      <div className="yaml-panel__errors" role="alert" aria-live="assertive">
        {hasErrors && (
          <>
            <p>YAML is invalid — the form and preview show the last valid version.</p>
            <ul>
              {yamlErrors.map((err, i) => (
                <li key={i}>
                  {err.line ? (
                    <button type="button" className="yaml-panel__error-link" onClick={() => jumpToLine(err.line!)}>
                      Line {err.line}
                    </button>
                  ) : null}
                  {err.path ? <code>{err.path}</code> : null} {err.message}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="yaml-panel__editor">
        <div className="yaml-panel__gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={errorLines.has(i + 1) ? 'yaml-panel__line yaml-panel__line--error' : 'yaml-panel__line'}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          id="yaml-editor"
          className="yaml-panel__textarea"
          value={text}
          onChange={(e) => scheduleSync(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Invoice YAML"
          aria-invalid={hasErrors}
          aria-describedby="yaml-editor-hint"
          rows={lineCount}
        />
      </div>
      <p id="yaml-editor-hint" className="yaml-panel__hint">
        Tab inserts two spaces. Press Escape, then Tab, to leave the editor.
      </p>
      <p className="sr-only" aria-live="polite">{status}</p>
    </div>
  );
}
