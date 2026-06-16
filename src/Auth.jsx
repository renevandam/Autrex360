import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './lib/supabase'

export default function AuthPage() {
  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <i className="ti ti-clipboard-check" style={{ color: '#1D9E75' }} /> Autrex360
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Inloggen om verder te gaan</div>
      </div>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#1D9E75', brandAccent: '#0F6E56' } } } }}
        providers={[]}
        localization={{ variables: { sign_in: { email_label: 'E-mailadres', password_label: 'Wachtwoord', button_label: 'Inloggen' }, sign_up: { email_label: 'E-mailadres', password_label: 'Wachtwoord', button_label: 'Account aanmaken' } } }}
      />
    </div>
  )
}