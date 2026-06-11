import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_CATEGORIES, fileVisual, formatBytes } from "@/components/documents/documentUtils";

const inputClass = "bg-surface border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

// Strip the extension for a friendlier default title.
const defaultTitle = (filename) => filename.replace(/\.[^.]+$/, "");

// Dialog shown after picking files: per-file title/category/notes, then
// uploads each file (same Core.UploadFile integration as expense receipts)
// and creates one Document record per file.
export default function DocumentUploadDialog({ open, onClose, client, files }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(() =>
    files.map((file) => ({
      file,
      title: defaultTitle(file.name),
      category: "Other",
      notes: "",
    }))
  );
  const [progress, setProgress] = useState(null); // index currently uploading

  const setRow = (index, patch) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const upload = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < rows.length; i++) {
        setProgress(i);
        const row = rows[i];
        const { file_url } = await base44.integrations.Core.UploadFile({ file: row.file });
        await base44.entities.Document.create({
          client_id: client.id,
          client_name: client.name,
          title: row.title.trim() || row.file.name,
          category: row.category,
          file_url,
          original_filename: row.file.name,
          mime_type: row.file.type || "",
          file_size: row.file.size,
          notes: row.notes.trim(),
          uploaded_by_name: user?.full_name || user?.email || "",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(rows.length === 1 ? "Document uploaded" : `${rows.length} documents uploaded`);
      onClose();
    },
    onError: (err) => {
      setProgress(null);
      toast.error(err.message || "Upload failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !upload.isPending && onClose()}>
      <DialogContent className="bg-surface border-line text-ink sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Upload to {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {rows.map((row, i) => {
            const { Icon, colour } = fileVisual({ mime_type: row.file.type, original_filename: row.file.name });
            return (
              <div key={i} className="rounded-xl border border-line p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-faint">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: colour }} />
                  <span className="truncate">{row.file.name}</span>
                  <span className="ml-auto flex-shrink-0">{formatBytes(row.file.size)}</span>
                  {progress === i && upload.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted">Title</Label>
                  <Input
                    className={`${inputClass} mt-1`}
                    value={row.title}
                    onChange={(e) => setRow(i, { title: e.target.value })}
                    disabled={upload.isPending}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted">Category</Label>
                  <Select
                    value={row.category}
                    onValueChange={(v) => setRow(i, { category: v })}
                    disabled={upload.isPending}
                  >
                    <SelectTrigger className={`${inputClass} mt-1`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-line">
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted">Notes (optional)</Label>
                  <Textarea
                    className={`${inputClass} mt-1 min-h-[60px]`}
                    value={row.notes}
                    onChange={(e) => setRow(i, { notes: e.target.value })}
                    disabled={upload.isPending}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary-hover text-white rounded-xl"
            onClick={() => upload.mutate()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading {progress !== null ? `${progress + 1} of ${rows.length}` : "…"}
              </>
            ) : (
              `Upload ${rows.length > 1 ? `${rows.length} files` : "file"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
