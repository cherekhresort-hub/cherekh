import { useState, useEffect } from 'react'
import { Save, Building2, Phone, Clock } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { defaultResortSettings, getResortSettings, saveResortSettings } from '../data/settings'
import { loadSiteSettings } from '../../lib/siteSettingsDb'
import type { ResortSettings } from '../types'

const Settings = () => {
  const toast = useToast()
  const [settings, setSettings] = useState<ResortSettings>(() => getResortSettings())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadSiteSettings().then((loaded) => {
      if (loaded) setSettings({ ...defaultResortSettings, ...loaded })
    })
  }, [])

  const update = <K extends keyof ResortSettings>(key: K, value: ResortSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    const ok = await saveResortSettings(settings)
    setSaving(false)
    if (ok) {
      toast.success('Settings saved', 'Changes are live on the public website.')
    } else {
      toast.error(
        'Saved locally only',
        'Could not sync to the website. Check Supabase connection and run migration 011.',
      )
    }
  }

  return (
    <>
      <TopBar
        title="Settings"
        description="Manage accommodation details shown on the public website"
        actions={
          <Button onClick={save} disabled={saving} leftIcon={<Save className="w-4 h-4" />}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-6 max-w-5xl">
        <Card padded={false} className="p-6">
          <div className="mb-4">
            <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4 text-forest-600" /> Property information</CardTitle>
            <CardDescription>Used in invoices, schema markup, and templates.</CardDescription>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Stay name">
              <Input value={settings.resortName} onChange={(e) => update('resortName', e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={settings.website} onChange={(e) => update('website', e.target.value)} />
            </Field>
            <Field label="Tagline" className="sm:col-span-2">
              <Input value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea value={settings.address} onChange={(e) => update('address', e.target.value)} rows={2} />
            </Field>
          </div>
        </Card>

        <Card padded={false} className="p-6">
          <div className="mb-4">
            <CardTitle className="flex items-center gap-2"><Phone className="w-4 h-4 text-teal-600" /> Contact</CardTitle>
            <CardDescription>Primary phone and email for guest communication.</CardDescription>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={settings.phone} onChange={(e) => update('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card padded={false} className="p-6">
          <div className="mb-4">
            <CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-sand-600" /> Check-in / Check-out</CardTitle>
            <CardDescription>Default times surfaced to guests and staff.</CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <Field label="Check-in time">
              <Input type="time" value={settings.checkInTime} onChange={(e) => update('checkInTime', e.target.value)} />
            </Field>
            <Field label="Check-out time">
              <Input type="time" value={settings.checkOutTime} onChange={(e) => update('checkOutTime', e.target.value)} />
            </Field>
          </div>
        </Card>

      </main>
    </>
  )
}

export default Settings
