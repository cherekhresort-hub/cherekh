import Swal from 'sweetalert2'

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export type ConfirmDeleteOptions = {
  title: string
  text?: string
  html?: string
  confirmText?: string
}

/** SweetAlert2 delete confirmation styled for the admin panel. */
export const confirmDelete = async ({
  title,
  text,
  html,
  confirmText = 'Delete',
}: ConfirmDeleteOptions): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text: html ? undefined : text,
    html,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#78716c',
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: true,
    customClass: {
      popup: 'cherekh-swal-popup',
      title: 'cherekh-swal-title',
      htmlContainer: 'cherekh-swal-text',
      actions: 'cherekh-swal-actions',
      confirmButton: 'cherekh-swal-confirm',
      cancelButton: 'cherekh-swal-cancel',
      icon: 'cherekh-swal-icon',
    },
  })

  return result.isConfirmed
}

export const confirmDeleteActivity = async (title: string, message: string): Promise<boolean> =>
  confirmDelete({
    title: 'Delete activity entry?',
    html: `<p class="font-medium text-stone-800 text-[13px] leading-snug">${escapeHtml(title)}</p><p class="mt-1.5 text-stone-600 text-xs leading-relaxed">${escapeHtml(message)}</p><p class="mt-2 text-[11px] text-stone-500">This cannot be undone.</p>`,
  })
