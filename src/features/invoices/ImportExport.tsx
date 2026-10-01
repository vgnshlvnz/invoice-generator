/**
 * ImportExport — drag-and-drop import and export-all functionality for invoices.
 */
import { useState } from 'react';
import { useAppState } from '../../state/store';
import { DropZone, Button, Dialog } from '../../ui';
import { fromYaml, toYaml } from '../../domain';
import type { InvoiceRepository } from '../../storage/repository';

interface ImportResult {
  fileName: string;
  status: 'imported' | 'skipped';
  reason?: string;
}

interface ImportExportProps {
  repository: InvoiceRepository;
}

/**
 * Component for importing .yaml files (with validation results) and exporting all data.
 */
export function ImportExport({ repository }: ImportExportProps) {
  const { state, dispatch } = useAppState();

  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showImportResults, setShowImportResults] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  /** Process imported YAML files and save to storage. */
  const handleImportFiles = async (files: FileList) => {
    const results: ImportResult[] = [];

    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(yaml|yml)$/i)) {
        results.push({ fileName: file.name, status: 'skipped', reason: 'Not a YAML file' });
        continue;
      }

      try {
        const text = await file.text();
        const result = fromYaml(text);

        if (!result.ok) {
          results.push({
            fileName: file.name,
            status: 'skipped',
            reason: result.errors[0]?.message ?? 'Invalid YAML',
          });
          continue;
        }

        const invoice = result.invoice;

        // Check for ID collision
        const existing = state.index.find((e) => e.id === invoice.id);
        if (existing) {
          results.push({
            fileName: file.name,
            status: 'skipped',
            reason: `ID collision with ${existing.number}`,
          });
          continue;
        }

        // Save to repository
        repository.saveInvoice(invoice);

        // Update local index
        const index = repository.listInvoices();
        dispatch({ type: 'SET_INDEX', index });

        results.push({ fileName: file.name, status: 'imported' });
      } catch {
        results.push({ fileName: file.name, status: 'skipped', reason: 'Could not read file' });
      }
    }

    setImportResults(results);
    setShowImportResults(true);
  };

  /** Export all invoices + profile + clients as multi-document YAML. */
  const handleExport = () => {
    const docs: string[] = [];

    // Profile
    docs.push('# Invoice Generator backup — profile');
    docs.push('---');
    docs.push('type: profile');
    docs.push(JSON.stringify(state.profile, null, 2));

    // Clients
    docs.push('---');
    docs.push('type: clients');
    docs.push(JSON.stringify(state.clients, null, 2));

    // Invoices
    for (const entry of state.index) {
      const raw = repository.getInvoice(entry.id);
      if (raw) {
        docs.push('---');
        docs.push(toYaml(raw));
      }
    }

    const blob = new Blob([docs.join('\n')], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoicegen-backup-${new Date().toISOString().slice(0, 10)}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportConfirm(false);
  };

  return (
    <div className="import-export">
      <h3>Import</h3>
      <DropZone
        onFiles={handleImportFiles}
        label="Drop .yaml files here or browse"
        accept=".yaml,.yml"
      />

      <h3>Export all</h3>
      <Button variant="secondary" size="sm" onClick={() => setShowExportConfirm(true)}>
        Export all as YAML
      </Button>

      <Dialog isOpen={showImportResults} onClose={() => setShowImportResults(false)} title="Import results">
        <ul className="import-results-list">
          {importResults.map((r, i) => (
            <li key={i} style={{ marginBottom: 'var(--spacing-sm)' }}>
              <strong>{r.fileName}:</strong>{' '}
              <span
                style={{
                  color: r.status === 'imported' ? 'var(--color-success)' : 'var(--color-danger)',
                }}
              >
                {r.status === 'imported'
                  ? '✓ Imported'
                  : `✗ Skipped${r.reason ? ': ' + r.reason : ''}`}
              </span>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        title="Export all"
      >
        <p>
          Export {state.index.length} invoice(s), profile, and {state.clients.length} saved client(s)
          as a single YAML file.
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
          <Button variant="secondary" onClick={() => setShowExportConfirm(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport}>
            Export
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
