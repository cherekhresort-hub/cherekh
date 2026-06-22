import emailjs from '@emailjs/browser'

const readEnv = (key: keyof ImportMetaEnv): string =>
  (import.meta.env[key] as string | undefined)?.trim() ?? ''

/** EmailJS “Public Key” (Dashboard → Account → API keys). */
export const getEmailJsPublicKey = (): string =>
  readEnv('VITE_EMAILJS_USER_ID') || readEnv('VITE_EMAILJS_PUBLIC_KEY')

export const getEmailJsConfigStatus = (): { ok: boolean; missing: string[] } => {
  const publicKey = getEmailJsPublicKey()
  const required = [
    ['VITE_EMAILJS_USER_ID', publicKey],
    ['VITE_EMAILJS_SERVICE_ID', readEnv('VITE_EMAILJS_SERVICE_ID')],
    ['VITE_EMAILJS_GUEST_TEMPLATE_ID', readEnv('VITE_EMAILJS_GUEST_TEMPLATE_ID')],
    ['VITE_EMAILJS_RESORT_TEMPLATE_ID', readEnv('VITE_EMAILJS_RESORT_TEMPLATE_ID')],
  ] as const

  const missing = required.filter(([, value]) => !value).map(([name]) => name)
  return { ok: missing.length === 0, missing }
}

export const isEmailJsConfigured = (): boolean => getEmailJsConfigStatus().ok

export const getEmailJsResortInbox = (): string =>
  readEnv('VITE_EMAILJS_RESORT_TO_EMAIL') || 'cherekhresort@gmail.com'

export const sendEmailJsTemplate = async (
  templateId: string,
  templateParams: Record<string, string>
): Promise<void> => {
  if (!isEmailJsConfigured()) return

  const publicKey = getEmailJsPublicKey()
  const serviceId = readEnv('VITE_EMAILJS_SERVICE_ID')

  await emailjs.send(serviceId, templateId, templateParams, { publicKey })
}

export const sendGuestBookingEmail = (params: Record<string, string>) =>
  sendEmailJsTemplate(readEnv('VITE_EMAILJS_GUEST_TEMPLATE_ID'), params)

export const sendResortBookingEmail = (params: Record<string, string>) =>
  sendEmailJsTemplate(readEnv('VITE_EMAILJS_RESORT_TEMPLATE_ID'), params)
