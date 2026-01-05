"use client";

import { useState, useEffect } from "react";
import { X, Mail, Check, Loader2, AlertCircle } from "lucide-react";

interface AccountMember {
  id: string;
  name: string;
  email: string;
}

interface EmailReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle?: string;
}

export function EmailReportDialog({
  isOpen,
  onClose,
  reportId,
  reportTitle,
}: EmailReportDialogProps) {
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch account members when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      fetchMembers();
    }
  }, [isOpen]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/members");
      if (!res.ok) {
        throw new Error("Failed to load team members");
      }
      const data = await res.json();
      setMembers(data.members || []);
      // Auto-select all members by default
      setSelectedIds(new Set(data.members?.map((m: AccountMember) => m.id) || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  }

  async function handleSend() {
    if (selectedIds.size === 0) {
      setError("Select at least one recipient");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds: Array.from(selectedIds) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSuccess(true);
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Email Report
              </h2>
              {reportTitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {reportTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Email sent!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sent to {selectedIds.size} recipient{selectedIds.size !== 1 ? "s" : ""}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Select team members to receive this report:
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Select All */}
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 w-full p-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedIds.size === members.length
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedIds.size === members.length && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                Select All ({members.length})
              </button>

              {/* Member List */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className="flex items-center gap-3 w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedIds.has(member.id)
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedIds.has(member.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {member.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {members.length === 0 && !loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No team members found
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send ({selectedIds.size})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
