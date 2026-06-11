import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_CATEGORIES } from "@/components/documents/documentUtils";

const inputClass = "bg-surface border-line text-ink placeholder:text-faint rounded-lg focus:border-primary focus:ring-primary/20";

// Edit a document's title / category / notes (file itself is immutable).
export default function EditDocumentDialog({ open, onClose, document: doc }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: doc.title || "",
    category: doc.category || "Other",
    notes: doc.notes || "",
  });

  const save = useMutation({
    mutationFn: () =>
      base44.entities.Document.update(doc.id, {
        title: form.title.trim() || doc.original_filename || "Untitled",
        category: form.category,
        notes: form.notes.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document updated");
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to update document"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-line text-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-faint truncate">{doc.original_filename}</p>
          <div>
            <Label className="text-xs text-muted">Title</Label>
            <Input
              className={`${inputClass} mt-1`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
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
            <Label className="text-xs text-muted">Notes</Label>
            <Textarea
              className={`${inputClass} mt-1 min-h-[60px]`}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary-hover text-white rounded-xl"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
