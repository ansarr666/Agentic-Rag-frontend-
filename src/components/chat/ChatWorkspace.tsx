import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, Citation, SourceItem, AgentStep } from '../../types';
import { MessageItem } from './MessageItem';
import { EmptyState } from './EmptyState';
import { ChatInput } from './ChatInput';
import { SourcePreviewDrawer } from '../sources/SourcePreviewDrawer';
import { DocumentModal } from '../sources/DocumentModal';
import { initialDocuments } from '../../data/mockData';
import { Sparkles, ShieldCheck, RefreshCw, Layers, Database, Globe, Calculator } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface ChatWorkspaceProps {
  conversation: Conversation;
  onUpdateConversation: (updated: Conversation) => void;
  onToast: (msg: string) => void;
  onOpenDocuments: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  conversation,
  onUpdateConversation,
  onToast,
  onOpenDocuments
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isLoading]);

  const handleSelectCitation = (citation: Citation) => {
    setActiveCitation(citation);
    setIsDrawerOpen(true);
  };

  const handleOpenFullDocument = (docId: string) => {
    setSelectedDocId(docId);
    setIsDocModalOpen(true);
  };

  const handleStop = () => {
    setIsLoading(false);
    onToast('Response generation stopped');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...conversation.messages, userMessage];
    onUpdateConversation({
      ...conversation,
      messages: updatedMessages,
      title: conversation.messages.length === 0 ? (query.slice(0, 36) + (query.length > 36 ? '...' : '')) : conversation.title,
      updatedAt: 'Just now'
    });

    setInput('');
    setIsLoading(true);

    try {
      // Connect to Real Agentic RAG Backend
      const res = await apiFetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, user_role: 'employee' })
      });

      if (res.ok) {
        const data = await res.json();

        // Convert structured sources to Citation model for preview drawers
        const rawSources: SourceItem[] = data.sources || [];
        const citations: Citation[] = rawSources.map((s, idx) => ({
          id: `c-${idx}-${Date.now()}`,
          chunkId: s.document_id,
          docId: s.document_id,
          docTitle: s.title,
          section: s.section || (s.type === 'google_drive' ? 'Google Drive Document' : s.type === 'web_search' ? 'External Web Source' : 'Company Knowledge'),
          page: s.page,
          snippet: s.snippet,
          highlightedText: s.snippet,
          confidenceScore: s.score || data.confidence_score,
          category: s.type === 'google_drive' ? 'Google Drive' : s.type === 'web_search' ? 'Web Grounding' : 'Internal Handbook'
        }));

        // Convert trace to UI steps
        const agentSteps: AgentStep[] = (data.execution_trace || []).map((t: any, i: number) => ({
          id: `step-${i}`,
          label: t.stage ? t.stage.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Pipeline Step',
          status: t.status === 'failed' ? 'failed' : 'completed',
          details: t.details,
          latency_ms: t.latency_ms
        }));

        const assistantMessage: Message = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latencyMs: Math.round(data.latency_ms || 120),
          confidenceScore: data.confidence_score,
          confidenceLabel: data.confidence_label,
          decision: data.decision,
          evidenceState: data.evidence_state,
          sources: rawSources,
          citations: citations,
          agentActivity: agentSteps
        };

        onUpdateConversation({
          ...conversation,
          messages: [...updatedMessages, assistantMessage],
          updatedAt: 'Just now'
        });

        setIsLoading(false);
        return;
      }
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `Request failed (HTTP ${res.status})`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Backend request failed';
      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: `I couldn't complete that request. ${reason}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      onUpdateConversation({
        ...conversation,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: 'Just now'
      });
      onToast(`Chat request failed: ${reason}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      
      {/* Top Knowledge Status Bar */}
      <div className="px-6 py-2.5 border-b border-border bg-surface/50 backdrop-blur-xs flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Internal RAG:</span>
            <span className="text-slate-400 truncate max-w-[200px]">OrionSoft_Chatbot_QA.pdf</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 border-l border-border pl-3 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Drive:</span>
            <span className="text-emerald-400 font-medium">Connected</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 border-l border-border pl-3 text-slate-400">
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>AST Calculator:</span>
            <span className="text-slate-300">Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Agent Router & Evidence Gating Active
          </span>
        </div>
      </div>

      {/* Chat Messages or Empty State */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {conversation.messages.length === 0 ? (
          <EmptyState onSelectSuggestion={(query) => handleSendMessage(query)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {conversation.messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onSelectCitation={handleSelectCitation}
                onToast={onToast}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 p-4 text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span>Evaluating intent, searching knowledge, and gating evidence...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={() => handleSendMessage()}
        isLoading={isLoading}
        onStop={handleStop}
      />

      {/* Source Preview Drawer */}
      <SourcePreviewDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        citation={activeCitation}
        onOpenFullDocument={handleOpenFullDocument}
        onToast={onToast}
      />

      {/* Full Document Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        document={initialDocuments.find(d => d.id === selectedDocId || d.filename === selectedDocId) || initialDocuments[0]}
      />

    </div>
  );
};
