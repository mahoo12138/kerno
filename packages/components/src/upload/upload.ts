import {
  AriaForwardingController,
  FormAssociatedElement,
  emit,
  prop,
  uniqueId,
  type PropertyValues,
} from '@kerno/core';
import { getIcon } from '@kerno/primitives/icon';
import { uploadStyles } from './upload.styles.js';

export type UploadFileStatus = 'ready' | 'uploading' | 'done' | 'error';
export type UploadRejectReason = 'type' | 'max-size' | 'max-files';

export interface UploadFileEntry {
  readonly id: string;
  readonly file: File;
  status: UploadFileStatus;
  progress: number;
  error?: string;
}

export interface UploadRejectDetail {
  file: File;
  reason: UploadRejectReason;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function matchesAccept(file: File, accept: string): boolean {
  const specs = accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (specs.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();

  return specs.some((spec) => {
    if (spec === '*' || spec === '*/*') return true;
    if (spec.startsWith('.')) return fileName.endsWith(spec);
    if (spec.endsWith('/*')) {
      const prefix = spec.slice(0, -1);
      return mime.startsWith(prefix);
    }
    return mime === spec;
  });
}

/**
 * Form-associated drag-and-drop file upload control with MIME/size/count
 * validation, per-file upload progress bars, and `ElementInternals` `FormData`
 * submission of `File` payloads.
 *
 * @tag k-upload
 *
 * @csspart dropzone - Interactive dropzone button.
 * @csspart list - Uploaded / queued file list.
 *
 * @fires k-upload-change - Fired when the file queue changes (`{ files }`).
 * @fires k-upload-remove - Fired when a file entry is removed (`{ entry }`).
 * @fires k-upload-reject - Fired when a file fails validation (`{ file, reason }`).
 */
export class KUpload extends FormAssociatedElement {
  static override styles = uploadStyles;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override template = /* html */ `<input class="native-input" type="file" /><button part="dropzone" class="dropzone" type="button"><span class="drop-icon" aria-hidden="true"></span><span class="drop-label"></span><span class="drop-hint"></span></button><ul part="list" class="list"></ul>`;

  @prop({ reflect: true }) accessor accept = '';
  @prop({ type: Boolean, reflect: true }) accessor multiple = false;
  /** Maximum file size in bytes (`0` = unlimited). */
  @prop({ type: Number, attribute: 'max-size', reflect: true }) accessor maxSize = 0;
  /** Maximum number of files allowed (`0` = unlimited). */
  @prop({ type: Number, attribute: 'max-files', reflect: true }) accessor maxFiles = 0;
  @prop({ reflect: true }) accessor label = '';
  @prop({ reflect: true }) accessor hint = '';

  #input!: HTMLInputElement;
  #dropzone!: HTMLButtonElement;
  #dropIcon!: HTMLSpanElement;
  #dropLabel!: HTMLSpanElement;
  #dropHint!: HTMLSpanElement;
  #list!: HTMLUListElement;

  #entries: UploadFileEntry[] = [];

  constructor() {
    super();
    // Forward host aria-label / aria-labelledby / <label for> to the focused dropzone button.
    new AriaForwardingController(this, { getTarget: () => this.#dropzone });
  }

  /** Current file queue snapshot. */
  get files(): readonly UploadFileEntry[] {
    return this.#entries;
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.#entries = [];
    if (this.#input) this.#input.value = '';
    this.#renderList();
    this.#syncFormAndValidity();
  }

  /** Programmatically adds files through the same validation pipeline as drag/drop. */
  addFiles(input: FileList | readonly File[]): UploadFileEntry[] {
    if (this.isDisabled) return [];
    const incoming = Array.from(input);
    const added: UploadFileEntry[] = [];

    if (!this.multiple && incoming.length > 0) {
      this.#entries = [];
    }

    for (const file of incoming) {
      if (!this.multiple && added.length >= 1) break;
      if (this.maxFiles > 0 && this.#entries.length >= this.maxFiles) {
        emit<UploadRejectDetail>(this, 'k-upload-reject', { file, reason: 'max-files' });
        continue;
      }
      if (this.accept && !matchesAccept(file, this.accept)) {
        emit<UploadRejectDetail>(this, 'k-upload-reject', { file, reason: 'type' });
        continue;
      }
      if (this.maxSize > 0 && file.size > this.maxSize) {
        emit<UploadRejectDetail>(this, 'k-upload-reject', { file, reason: 'max-size' });
        continue;
      }
      const entry: UploadFileEntry = {
        id: uniqueId('k-file'),
        file,
        status: 'ready',
        progress: 0,
      };
      this.#entries.push(entry);
      added.push(entry);
    }

    if (added.length > 0) {
      this.markInteracted();
      this.#renderList();
      this.#syncFormAndValidity();
      emit(this, 'k-upload-change', { files: [...this.#entries] });
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
    return added;
  }

  /** Updates upload progress (`0`–`100`) for a queued file entry. */
  setFileProgress(id: string, progress: number): void {
    const entry = this.#entries.find((e) => e.id === id);
    if (!entry) return;
    entry.progress = Math.min(100, Math.max(0, Math.round(progress)));
    if (entry.status === 'ready' && entry.progress > 0 && entry.progress < 100) {
      entry.status = 'uploading';
    }
    this.#renderList();
  }

  /** Updates status (`'ready' | 'uploading' | 'done' | 'error'`) for a queued file entry. */
  setFileStatus(id: string, status: UploadFileStatus, error?: string): void {
    const entry = this.#entries.find((e) => e.id === id);
    if (!entry) return;
    entry.status = status;
    entry.error = error;
    if (status === 'done') entry.progress = 100;
    this.#renderList();
  }

  /** Removes a file from the queue by entry ID. */
  removeFile(id: string): void {
    const idx = this.#entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const [removed] = this.#entries.splice(idx, 1);
    this.markInteracted();
    this.#renderList();
    this.#syncFormAndValidity();
    if (removed) {
      emit(this, 'k-upload-remove', { entry: removed });
    }
    emit(this, 'k-upload-change', { files: [...this.#entries] });
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /** Clears all queued files. */
  clearFiles(): void {
    if (this.#entries.length === 0) return;
    this.#entries = [];
    this.#input.value = '';
    this.#renderList();
    this.#syncFormAndValidity();
    emit(this, 'k-upload-change', { files: [] });
  }

  protected override setup(): void {
    this.#input = this.renderRoot.querySelector('.native-input') as HTMLInputElement;
    this.#dropzone = this.renderRoot.querySelector('.dropzone') as HTMLButtonElement;
    this.#dropIcon = this.renderRoot.querySelector('.drop-icon') as HTMLSpanElement;
    this.#dropLabel = this.renderRoot.querySelector('.drop-label') as HTMLSpanElement;
    this.#dropHint = this.renderRoot.querySelector('.drop-hint') as HTMLSpanElement;
    this.#list = this.renderRoot.querySelector('.list') as HTMLUListElement;

    this.#dropIcon.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('upload') ?? ''}</svg>`;

    this.#dropzone.addEventListener('click', () => {
      if (this.isDisabled) return;
      this.#input.value = '';
      this.#input.click();
    });

    this.#input.addEventListener('change', () => {
      if (this.#input.files && this.#input.files.length > 0) {
        this.addFiles(this.#input.files);
      }
    });

    this.#dropzone.addEventListener('dragover', (e) => {
      if (this.isDisabled) return;
      e.preventDefault();
      this.#dropzone.classList.add('dragging');
    });

    this.#dropzone.addEventListener('dragleave', () => {
      this.#dropzone.classList.remove('dragging');
    });

    this.#dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.#dropzone.classList.remove('dragging');
      if (this.isDisabled) return;
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        this.addFiles(e.dataTransfer.files);
      }
    });
  }

  protected override update(_changed: PropertyValues): void {
    const disabled = this.isDisabled;
    this.#dropzone.disabled = disabled;
    this.#input.disabled = disabled;
    this.#input.multiple = this.multiple;
    this.#input.accept = this.accept;

    this.#dropLabel.textContent = this.label || this.localize.term('uploadPrompt');
    const autoHints: string[] = [];
    if (this.accept) autoHints.push(this.accept);
    if (this.maxSize > 0) {
      autoHints.push(this.localize.term('maxFileSize', formatFileSize(this.maxSize)));
    }
    if (this.maxFiles > 0) autoHints.push(this.localize.term('maxFiles', this.maxFiles));
    this.#dropHint.textContent = this.hint || autoHints.join(' · ');

    this.#renderList();
    this.#syncFormAndValidity();
  }

  #renderList(): void {
    const frag = document.createDocumentFragment();
    for (const entry of this.#entries) {
      const li = document.createElement('li');
      li.className = 'item';
      li.dataset.status = entry.status;

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = `<svg viewBox="0 0 16 16">${getIcon('file') ?? ''}</svg>`;

      const meta = document.createElement('div');
      meta.className = 'file-meta';

      const top = document.createElement('div');
      top.className = 'file-top';

      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = entry.file.name;

      const size = document.createElement('span');
      size.className = 'file-size';
      size.textContent = formatFileSize(entry.file.size);

      top.append(name, size);
      meta.append(top);

      if (entry.status === 'uploading' || (entry.status === 'done' && entry.progress > 0)) {
        const track = document.createElement('div');
        track.className = 'bar-track';
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.width = `${entry.progress}%`;
        track.append(fill);
        meta.append(track);
      }

      if (entry.error) {
        const err = document.createElement('span');
        err.className = 'file-error';
        err.textContent = entry.error;
        meta.append(err);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.disabled = this.isDisabled;
      removeBtn.setAttribute('aria-label', this.localize.term('remove', entry.file.name));
      removeBtn.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${getIcon('trash') ?? ''}</svg>`;
      removeBtn.addEventListener('click', () => this.removeFile(entry.id));

      li.append(icon, meta, removeBtn);
      frag.append(li);
    }
    this.#list.replaceChildren(frag);
  }

  #syncFormAndValidity(): void {
    if (this.isDisabled || this.#entries.length === 0) {
      this.setFormValue(null);
    } else if (this.name) {
      const fd = new FormData();
      for (const entry of this.#entries) {
        fd.append(this.name, entry.file);
      }
      this.setFormValue(fd);
    } else {
      this.setFormValue(this.#entries[0]!.file);
    }

    if (this.isDisabled) {
      this.setValidity({});
      return;
    }
    if (this.required && this.#entries.length === 0) {
      this.setValidity({ valueMissing: true }, this.localize.term('filesRequired'), this.#dropzone);
    } else {
      this.setValidity({});
    }
  }
}
