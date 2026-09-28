import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { LeadGateData } from './types';

interface Props {
  onSubmit: (lead: LeadGateData) => Promise<void>;
}

export function LeadGate({ onSubmit }: Props) {
  const [lead, setLead] = useState<LeadGateData>({ name: '', email: '', countryCode: '+91', phone: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof LeadGateData, value: string) =>
    setLead((c) => ({ ...c, [field]: value }));

  const typoSuggestion = (() => {
    const parts = lead.email.split('@');
    if (parts.length === 2) {
      const d = parts[1].toLowerCase().trim();
      const map: Record<string, string> = {
        'gmai.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com',
        'gmial.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
        'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
        'outloo.com': 'outlook.com', 'outlok.com': 'outlook.com',
        'iclou.com': 'icloud.com', 'protn.me': 'proton.me', 'protomail.com': 'protonmail.com'
      };
      if (map[d]) return `${parts[0]}@${map[d]}`;
    }
    return null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(lead.email)) {
      return setError('Please enter a valid email address.');
    }
    if (!/^\d{10}$/.test(lead.phone)) {
      return setError('Please enter a 10-digit phone number.');
    }
    setSubmitting(true);
    try {
      await onSubmit({ ...lead, email: lead.email.trim(), name: lead.name.trim() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="os-lead-gate" aria-labelledby="lead-gate-title">
      <p className="os-lead-gate__intro">
        A quick hello first! Please share your name, email, and phone number so we can personalize your consultation, then you can start chatting right away.
      </p>
      <form className="os-lead-gate__form" onSubmit={handleSubmit}>
        <label>
          Full Name *
          <input
            required
            autoComplete="name"
            autoFocus
            placeholder="Your full name"
            value={lead.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>
        <label>
          Email Address *
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="you@company.com or you@gmail.com"
            value={lead.email}
            onChange={(e) => update('email', e.target.value)}
          />
          {typoSuggestion && (
            <span style={{ fontSize: '11px', color: '#2563eb', marginTop: 3 }}>
              Did you mean{' '}
              <button
                type="button"
                onClick={() => update('email', typoSuggestion)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  color: '#1d4ed8',
                  fontWeight: 600
                }}
              >
                {typoSuggestion}
              </button>
              ?
            </span>
          )}
        </label>
        <div className="os-lead-gate__phone-field" role="group" aria-label="Phone Number">
          <span>Phone Number *</span>
          <span className="os-lead-gate__phone">
            <select
              aria-label="Country code"
              value={lead.countryCode}
              onChange={(e) => update('countryCode', e.target.value)}
            >
              <option value="+91">India +91</option>
              <option value="+1">US/Canada +1</option>
              <option value="+44">UK +44</option>
              <option value="+971">UAE +971</option>
              <option value="+61">Australia +61</option>
              <option value="+49">Germany +49</option>
              <option value="+33">France +33</option>
              <option value="+27">South Africa +27</option>
            </select>
            <input
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="10-digit phone number"
              placeholder="10-digit phone number"
              pattern="[0-9]{10}"
              maxLength={10}
              value={lead.phone}
              onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </span>
        </div>
        <label>
          Company Name (optional)
          <input
            autoComplete="organization"
            placeholder="Company name"
            value={lead.company}
            onChange={(e) => update('company', e.target.value)}
          />
        </label>
        {error && <p className="os-form-error" role="alert">{error}</p>}
        <button className="os-lead-gate__submit" type="submit" disabled={submitting}>
          {submitting ? 'Connecting...' : 'Start Conversation'}
          {!submitting && <ArrowRight aria-hidden="true" />}
        </button>
        <p className="os-form-note">🔒 Your information is secure and only used for your consultation enquiry.</p>
      </form>
    </section>
  );
}
