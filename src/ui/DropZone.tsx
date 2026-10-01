/**
 * DropZone — drag-and-drop file upload area.
 */
import { useRef, useState } from 'react';
import './DropZone.css';
import type { ChangeEvent, DragEvent, HTMLAttributes, ReactNode } from 'react';

interface DropZoneProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onFiles'> {
  onFiles: (files: FileList) => void;
  accept?: string;
  label?: ReactNode;
}

/**
 * A drop zone that accepts dragged files and a file picker fallback.
 */
export function DropZone({
  onFiles,
  accept = '.yaml,.yml',
  label,
  ...rest
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    setIsDragOver(false);
    onFiles(files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`dropzone${isDragOver ? ' dropzone--dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={handleButtonClick}
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to browse"
      {...rest}
    >
      <input
        ref={inputRef}
        type="file"
        className="dropzone__input"
        accept={accept}
        multiple
        onChange={handleChange}
      />
      {label ? (
        <span className="dropzone__label">{label}</span>
      ) : (
        <span className="dropzone__label">
          Drop files here or <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>browse</span>
        </span>
      )}
    </div>
  );
}
