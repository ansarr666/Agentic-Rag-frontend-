import { RotateCcw, Sparkles } from 'lucide-react';

export function ChatHeader({ onReset }: { onReset?: () => void }) {
  return (
    <header className="os-chat-header">
      <div className="os-chat-header__identity">
        <span className="os-chat-header__mark"><Sparkles aria-hidden="true" /></span>
        <div>
          <h1 id="orionsoft-chat-title">OrionSoft AI</h1>
          <p>Digital Solution Consultant</p>
          <span className="os-online"><i aria-hidden="true" />Online</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="os-icon-button"
            aria-label="Restart conversation"
            title="Start new conversation"
          >
            <RotateCcw style={{ width: '15px', height: '15px' }} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
