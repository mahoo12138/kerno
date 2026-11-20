import { define, isServer, uniqueId } from '@kerno/core';
import { KToast, KToastContainer, type ToastPlacement, type ToastVariant } from './toast.js';

export interface ToastOptions {
  /** Custom toast identifier (auto-generated if omitted). */
  id?: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss timeout in milliseconds (`0` = persistent). Defaults to `4000`. */
  duration?: number;
  closable?: boolean;
  acrylic?: boolean;
  placement?: ToastPlacement;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastHandle {
  readonly id: string;
  readonly closed: Promise<void>;
  dismiss(): void;
}

const activeToasts = new Map<string, KToast>();
let singletonContainer: KToastContainer | null = null;

function ensureDefined(): void {
  define('k-toast', KToast);
  define('k-toast-container', KToastContainer);
}

function getContainer(placement?: ToastPlacement): KToastContainer {
  ensureDefined();
  if (!singletonContainer || !singletonContainer.isConnected) {
    const existing = document.querySelector<KToastContainer>(
      'k-toast-container[data-k-toast-singleton]',
    );
    if (existing) {
      singletonContainer = existing;
    } else {
      const container = document.createElement('k-toast-container') as KToastContainer;
      container.setAttribute('data-k-toast-singleton', '');
      container.placement = placement ?? 'bottom-end';
      document.body.append(container);
      singletonContainer = container;
    }
  }
  if (placement) {
    singletonContainer.placement = placement;
  }
  return singletonContainer;
}

function show(options: ToastOptions): ToastHandle {
  const id = options.id ?? uniqueId('k-toast');
  if (isServer || typeof document === 'undefined') {
    return { id, closed: Promise.resolve(), dismiss() {} };
  }

  const container = getContainer(options.placement);
  const el = document.createElement('k-toast') as KToast;
  el.dataset.toastId = id;
  el.variant = options.variant ?? 'info';
  el.title = options.title;
  if (options.description) el.description = options.description;
  if (typeof options.duration === 'number') el.duration = options.duration;
  if (typeof options.closable === 'boolean') el.closable = options.closable;
  if (typeof options.acrylic === 'boolean') el.acrylic = options.acrylic;
  if (options.actionLabel) el.actionLabel = options.actionLabel;

  if (options.onAction) {
    el.addEventListener('k-action', () => options.onAction?.());
  }

  activeToasts.set(id, el);

  const closed = new Promise<void>((resolve) => {
    const finalize = (): void => {
      activeToasts.delete(id);
      if (el.isConnected) el.remove();
      resolve();
    };
    el.addEventListener('k-after-close', finalize, { once: true });
  });

  container.append(el);

  return {
    id,
    closed,
    dismiss() {
      void el.dismiss('programmatic');
    },
  };
}

function dismiss(id?: string): void {
  if (id !== undefined) {
    const target = activeToasts.get(id);
    if (target) void target.dismiss('programmatic');
    return;
  }
  for (const el of [...activeToasts.values()]) {
    void el.dismiss('programmatic');
  }
}

function clear(): void {
  for (const el of [...activeToasts.values()]) {
    el.remove();
  }
  activeToasts.clear();
  if (singletonContainer?.isConnected) {
    singletonContainer.innerHTML = '';
  }
}

/**
 * Imperative toast notification service backed by a Top-Layer `<k-toast-container>`.
 */
export const toast = {
  show,
  info(title: string, options: Omit<ToastOptions, 'title' | 'variant'> = {}): ToastHandle {
    return show({ ...options, title, variant: 'info' });
  },
  success(title: string, options: Omit<ToastOptions, 'title' | 'variant'> = {}): ToastHandle {
    return show({ ...options, title, variant: 'success' });
  },
  warning(title: string, options: Omit<ToastOptions, 'title' | 'variant'> = {}): ToastHandle {
    return show({ ...options, title, variant: 'warning' });
  },
  danger(title: string, options: Omit<ToastOptions, 'title' | 'variant'> = {}): ToastHandle {
    return show({ ...options, title, variant: 'danger' });
  },
  dismiss,
  clear,
};
