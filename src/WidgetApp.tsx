import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatHeader } from './components/widget/ChatHeader';
import { ChatInput } from './components/widget/ChatInput';
import { ChatLauncher } from './components/widget/ChatLauncher';
import { LeadGate } from './components/widget/LeadGate';
import { MessageBubble } from './components/widget/MessageBubble';
import { SuggestedQuestions } from './components/widget/SuggestedQuestions';
import { TypingIndicator } from './components/widget/TypingIndicator';
import type { ChatMessage, HistoryTurn, LeadGateData, SuggestedQuestion } from './components/widget/types';
import { apiUrl } from './api';

const STORAGE_KEY = 'orionsoft-ai-conversation-v5';

// Clear legacy session storage so tests and visitors always see the lead form on new version
try {
  if (typeof window !== 'undefined') {
    ['orionsoft-ai-conversation-v1', 'orionsoft-ai-conversation-v2', 'orionsoft-ai-conversation-v3', 'orionsoft-ai-conversation-v4'].forEach(
      (k) => sessionStorage.removeItem(k)
    );
  }
} catch {}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi 👋 I'm OrionSoft AI.\n\nThink of me as your first step toward building smarter technology.\n\nI can help you explore **AI, Generative AI, intelligent automation, custom software, data solutions, and more** — and understand how OrionSoft can turn your idea into a real-world solution.\n\n**What are you looking to build or solve?**",
};

const message = (role: ChatMessage['role'], content: string, tone?: ChatMessage['tone']): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  content,
  tone,
});

interface SavedState {
  phase: 'lead' | 'chat';
  leadId: string;
  conversationId: string;
  leadName: string;
  bookingPhone: string;
  messages: ChatMessage[];
}

function restoreState(): SavedState {
  const fallback: SavedState = { phase: 'lead', leadId: '', conversationId: '', leadName: '', bookingPhone: '', messages: [] };
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<SavedState>;
    if (parsed.phase === 'chat' && parsed.leadId) {
      return {
        phase: 'chat',
        leadId: parsed.leadId,
        conversationId: parsed.conversationId ?? '',
        leadName: parsed.leadName ?? '',
        bookingPhone: parsed.bookingPhone ?? '',
        messages: Array.isArray(parsed.messages) && parsed.messages.length ? parsed.messages : [WELCOME_MESSAGE],
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export default function WidgetApp() {
  const restored = useMemo(restoreState, []);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isStandalone = typeof window !== 'undefined' && window.location.pathname === '/';
  const [isOpen, setIsOpen] = useState(isInIframe || isStandalone);
  const [showLabel, setShowLabel] = useState(true);
  const [phase, setPhase] = useState<'lead' | 'chat'>(restored.phase);
  const [leadId, setLeadId] = useState(restored.leadId);
  const [conversationId, setConversationId] = useState(restored.conversationId);
  const [leadName, setLeadName] = useState(restored.leadName);
  const [bookingPhone, setBookingPhone] = useState(restored.bookingPhone);
  const [messages, setMessages] = useState<ChatMessage[]>(restored.messages.length ? restored.messages : [WELCOME_MESSAGE]);
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<'normal' | 'high'>('normal');
  const [handoffDone, setHandoffDone] = useState(false);
  const [retry, setRetry] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState('');
  const [pendingExpert, setPendingExpert] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLabel(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'chat' && leadId) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, leadId, conversationId, leadName, bookingPhone, messages }));
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [phase, leadId, conversationId, leadName, bookingPhone, messages, suggestions, loading, intent]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) closeChat();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || data.type !== 'orionsoft:open') return;
      setIsOpen(true);
      if (data.mode === 'expert') {
        if (phase === 'chat' && leadId) {
          setIntent('high');
        } else {
          setPendingExpert(true);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [phase, leadId]);

  useEffect(() => {
    if (isInIframe) {
      document.body.classList.add('is-iframe');
    } else if (isStandalone) {
      document.body.classList.add('is-standalone');
    }
    return () => {
      document.body.classList.remove('is-iframe', 'is-standalone');
    };
  }, [isInIframe, isStandalone]);

  function closeChat() {
    setIsOpen(false);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'orionsoft:close' }, '*');
    }
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.os-launcher')?.focus(), 0);
  }

  const submitLead = async (lead: LeadGateData) => {
    const { countryCode, ...contact } = lead;
    const response = await fetch(apiUrl('/api/public/lead'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...contact, country_code: countryCode }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'We could not save your details. Please try again.');
    }
    setLeadId(data.lead_id);
    setConversationId(data.conversation_id);
    setLeadName(lead.name);
    setBookingPhone(`${countryCode}${lead.phone}`);
    setMessages([WELCOME_MESSAGE]);
    setSuggestions([]);
    setIntent(pendingExpert ? 'high' : 'normal');
    setPendingExpert(false);
    setHandoffDone(false);
    setRetry(false);
    setPhase('chat');
  };

  const sendMessage = async (provided?: string) => {
    const question = (provided ?? input).trim();
    if (!question || loading) return;
    setInput('');
    setSuggestions([]);
    setIntent('normal');
    setRetry(false);
    setMessages((current) => [...current, message('user', question)]);
    setLoading(true);
    try {
      const history: HistoryTurn[] = messages.map((item) => ({ role: item.role, content: item.content }));
      const response = await fetch(apiUrl('/api/public/conversation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history,
          lead_id: leadId,
          conversation_id: conversationId,
          name: leadName,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Request failed');
      setMessages((current) => [...current, message('assistant', data.answer || 'I can help you explore that.')]);
      const questions: string[] = Array.isArray(data.suggested_questions) ? data.suggested_questions.slice(0, 4) : [];
      setSuggestions(questions.map((text, index) => ({ id: `q-${Date.now()}-${index}`, text })));
      setIntent(data.intent === 'high' ? 'high' : 'normal');
    } catch {
      setRetry(true);
      setLastFailedInput(question);
      setMessages((current) => [...current, message('assistant', "I'm having trouble responding right now. Please try again in a moment.", 'error')]);
    } finally {
      setLoading(false);
    }
  };

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const confirmBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBookingError('');
    const cleanPhone = bookingPhone.trim();
    if (cleanPhone.replace(/\D/g, '').length < 7) {
      setBookingError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    setBookingSubmitting(true);
    const summary = messages
      .filter((item) => item.role === 'user')
      .map((item) => item.content)
      .join(' | ')
      .slice(0, 4000);
    try {
      const response = await fetch(apiUrl('/api/public/intent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          conversation_id: conversationId,
          phone: cleanPhone,
          requested_action: 'Book a Discovery Call',
          summary,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to submit booking request.');
      }
      setHandoffDone(true);
      setBookingOpen(false);
      setIntent('normal');
      setMessages((current) => [
        ...current,
        message(
          'assistant',
          `🎉 Thank you, ${leadName || 'there'}! Your discovery call request has been confirmed. A confirmation email has been dispatched to your inbox, and our engineering team will reach out to you at ${cleanPhone} shortly.`
        ),
      ]);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Could not confirm call. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const resetChat = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      ['orionsoft-ai-conversation-v1', 'orionsoft-ai-conversation-v2', 'orionsoft-ai-conversation-v3', 'orionsoft-ai-conversation-v4', 'orionsoft-ai-conversation-v5'].forEach(
        (k) => sessionStorage.removeItem(k)
      );
    } catch {}
    setPhase('lead');
    setLeadId('');
    setConversationId('');
    setLeadName('');
    setBookingPhone('');
    setMessages([WELCOME_MESSAGE]);
    setSuggestions([]);
    setIntent('normal');
    setHandoffDone(false);
    setBookingOpen(false);
  };

  return (
    <div className="os-widget-root">
      {!isOpen && <ChatLauncher isOpen={false} showLabel={showLabel} onClick={() => setIsOpen(true)} />}
      {isOpen && (
        <section id="orionsoft-chat-window" className="os-chat-window" role="dialog" aria-labelledby="orionsoft-chat-title">
          <ChatHeader onClose={closeChat} onReset={resetChat} />
          <main className="os-chat-messages" aria-live="polite" aria-busy={loading}>
            {phase === 'lead' ? (
              <LeadGate onSubmit={submitLead} />
            ) : (
              <>
                {messages.map((item) => <MessageBubble key={item.id} message={item} />)}
                {loading && <TypingIndicator />}
                {!loading && intent === 'high' && !handoffDone && !bookingOpen && (
                  <button type="button" className="os-cta" onClick={() => setBookingOpen(true)}>
                    📅 Book a Discovery Call with an Expert
                  </button>
                )}
                {!loading && bookingOpen && !handoffDone && (
                  <div className="os-solution-card" style={{ margin: '8px 0 8px 37px' }}>
                    <div className="os-solution-card__eyebrow">
                      <span>📅 Book a Discovery Call</span>
                    </div>
                    <h2 style={{ fontSize: '14px', margin: '6px 0 2px' }}>Schedule a Consultation</h2>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      Enter your phone number so our specialist can call you:
                    </p>
                    <form onSubmit={confirmBooking} style={{ display: 'grid', gap: '8px' }}>
                      <input
                        type="tel"
                        required
                        autoFocus
                        placeholder="+1 555 123 4567"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 11px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                      {bookingError && (
                        <p style={{ color: '#dc2626', fontSize: '11px', margin: 0 }}>{bookingError}</p>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="submit"
                          disabled={bookingSubmitting}
                          className="os-lead-submit"
                          style={{ flex: 1, minHeight: '36px', fontSize: '12px' }}
                        >
                          {bookingSubmitting ? 'Confirming...' : 'Confirm Call Request'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setBookingOpen(false); setBookingError(''); }}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                {!loading && retry && (
                  <button type="button" className="os-cta os-cta--retry" onClick={() => void sendMessage(lastFailedInput)}>
                    Try again
                  </button>
                )}
                {!loading && <SuggestedQuestions questions={suggestions} onSelect={(question) => void sendMessage(question.text)} />}
              </>
            )}
            <div ref={endRef} />
          </main>
          {phase === 'chat' && (
            <ChatInput value={input} disabled={loading} onChange={setInput} onSubmit={() => void sendMessage()} />
          )}
          <footer>AI-powered guidance from OrionSoft Technologies</footer>
        </section>
      )}
    </div>
  );
}
