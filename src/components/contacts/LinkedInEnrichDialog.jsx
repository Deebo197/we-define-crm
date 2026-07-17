import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, X, Loader2, ImageIcon, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

/**
 * Searches the web for a person's LinkedIn profile using the LLM with
 * internet context, then presents the candidate data (photo, name, job
 * title, headline) for manual approval before anything is saved.
 */
export default function LinkedInEnrichDialog({ contact, onClose }) {
  const queryClient = useQueryClient();
  const [results, setResults] = useState(null);
  const [accepted, setAccepted] = useState({ photo_url: false, role: false, linkedin_headline: false });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const prompt = `Search the web for this person's LinkedIn profile page. I need you to find as much information as possible, especially their profile photo.

Person: ${contact.name}
Company: ${contact.company_name || "(unknown)"}
LinkedIn URL: ${contact.linkedin || "(not recorded)"}

CRITICAL — Profile Photo:
Search specifically for this person's LinkedIn profile photo. LinkedIn profile photos are hosted on media.licdn.com (e.g. https://media.licdn.com/dms/image/...). Look for:
  • The og:image meta tag URL from their LinkedIn profile page
  • Any media.licdn.com image URL associated with their profile
  • The profile picture URL from their LinkedIn page content
Do NOT leave photo_url empty if you can find any image URL on their LinkedIn profile. Try searching for "${contact.name} ${contact.company_name || ""} LinkedIn profile photo" if needed.

Also extract:
  • full_name, first_name, last_name
  • job_title — their current role/title at their company
  • headline — their full LinkedIn headline text
  • location — city/country from their profile
  • confidence — how sure you are this is the right person (high/medium/low)

Return verified public information only. If you truly cannot find a field, use an empty string.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_1_pro",
        response_json_schema: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            job_title: { type: "string" },
            headline: { type: "string" },
            photo_url: { type: "string" },
            location: { type: "string" },
            confidence: { type: "string" },
          },
        },
      });
      return res;
    },
    onSuccess: (data) => {
      setResults(data);
      setAccepted({
        photo_url: !!data.photo_url,
        role: !!data.job_title,
        linkedin_headline: !!data.headline,
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const patch = {};
      if (accepted.photo_url && results.photo_url) patch.photo_url = results.photo_url;
      if (accepted.role && results.job_title) patch.role = results.job_title;
      if (accepted.linkedin_headline && results.headline) patch.linkedin_headline = results.headline;
      if (Object.keys(patch).length === 0) return;
      await base44.entities.Contact.update(contact.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      onClose();
    },
  });

  const toggleField = (field) => {
    setAccepted((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface rounded-2xl shadow-card border border-line max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-line">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <h3 className="text-ink font-medium">Enrich from LinkedIn</h3>
            </div>
            <button type="button" onClick={onClose} className="text-faint hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Person context */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-line">
              <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                <span className="text-primary font-medium text-sm">{contact.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-ink text-sm font-medium truncate">{contact.name}</p>
                <p className="text-faint text-xs truncate">{contact.company_name || "No company"}</p>
              </div>
            </div>

            {/* Search button / loading */}
            {!results && (
              <div className="text-center py-6">
                {searchMutation.isPending ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-muted text-sm">Searching the web for {contact.name}'s LinkedIn profile…</p>
                  </div>
                ) : searchMutation.isError ? (
                  <div className="flex flex-col items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                    <p className="text-muted text-sm">Search failed. {searchMutation.error?.message}</p>
                    <Button type="button" variant="outline" onClick={() => searchMutation.mutate()} className="text-xs">
                      Try again
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => searchMutation.mutate()}
                    className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5"
                  >
                    <Search className="w-4 h-4 mr-2" /> Search LinkedIn
                  </Button>
                )}
              </div>
            )}

            {/* Results preview */}
            {results && (
              <>
                {/* Confidence indicator */}
                <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                  results.confidence === "high"
                    ? "bg-success/5 border-success/20 text-[#00804C]"
                    : results.confidence === "medium"
                    ? "bg-warning/10 border-warning/20 text-[#B26B00]"
                    : "bg-danger/5 border-danger/20 text-danger"
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Match confidence: <span className="font-medium capitalize">{results.confidence || "low"}</span>
                  {results.confidence !== "high" && " — please verify carefully before accepting."}
                </div>

                <p className="text-faint text-xs">
                  Review each field below. Toggle the checkbox to accept or reject it. Only accepted fields will be saved.
                </p>

                {/* Photo */}
                {results.photo_url && (
                  <EnrichField
                    accepted={accepted.photo_url}
                    onToggle={() => toggleField("photo_url")}
                    label="Profile Photo"
                  >
                    <img
                      src={results.photo_url}
                      alt="Profile"
                      className="w-20 h-20 rounded-2xl object-cover border border-line"
                      onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                    />
                    <div className="w-20 h-20 rounded-2xl bg-canvas border border-line items-center justify-center hidden">
                      <ImageIcon className="w-6 h-6 text-faint" />
                    </div>
                  </EnrichField>
                )}

                {/* Job title */}
                {results.job_title && (
                  <EnrichField
                    accepted={accepted.role}
                    onToggle={() => toggleField("role")}
                    label="Job Title"
                  >
                    <p className="text-ink text-sm">{results.job_title}</p>
                  </EnrichField>
                )}

                {/* Headline */}
                {results.headline && (
                  <EnrichField
                    accepted={accepted.linkedin_headline}
                    onToggle={() => toggleField("linkedin_headline")}
                    label="LinkedIn Headline"
                  >
                    <p className="text-muted text-sm">{results.headline}</p>
                  </EnrichField>
                )}

                {/* Location (read-only, for verification only) */}
                {results.location && (
                  <div className="p-3 rounded-xl bg-canvas border border-line">
                    <p className="text-faint text-[10px] uppercase tracking-wider font-medium mb-1">Location (for verification)</p>
                    <p className="text-muted text-sm">{results.location}</p>
                  </div>
                )}

                {/* Nothing found */}
                {!results.photo_url && !results.job_title && !results.headline && (
                  <p className="text-muted text-sm text-center py-4">
                    No LinkedIn data could be found for this person. Try adding their LinkedIn URL to the contact record first.
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={onClose} className="text-faint hover:text-ink">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !Object.values(accepted).some(Boolean)}
                    className="bg-primary hover:bg-primary-hover text-white rounded-xl px-5"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Saving…" : "Accept & Save"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EnrichField({ accepted, onToggle, label, children }) {
  return (
    <div className={`p-3 rounded-xl border transition-colors ${accepted ? "bg-success/5 border-success/20" : "bg-canvas border-line opacity-60"}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            accepted ? "bg-success border-success" : "border-line-strong bg-surface"
          }`}
        >
          {accepted && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-faint text-[10px] uppercase tracking-wider font-medium mb-1">{label}</p>
          {children}
        </div>
      </div>
    </div>
  );
}