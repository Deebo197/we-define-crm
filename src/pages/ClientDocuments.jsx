import React, { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft, Upload, Search, FileText, ExternalLink, Pencil, Trash2, StickyNote, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/EmptyState";
import ShimmerCard from "@/components/ui/ShimmerCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import DocumentUploadDialog from "@/components/documents/DocumentUploadDialog";
import EditDocumentDialog from "@/components/documents/EditDocumentDialog";
import { categoryPillClasses, fileVisual, formatBytes } from "@/components/documents/documentUtils";

function DocumentRow({ doc, canDelete, onEdit, onDelete }) {
  const { Icon, colour } = fileVisual(doc);
  const uploadedDate = doc.created_date ? format(new Date(doc.created_date), "d MMM yyyy") : "—";

  return (
    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,2fr)_auto_auto_minmax(0,1.2fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 border-b border-line last:border-b-0 hover:bg-canvas/60 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" style={{ color: colour }} strokeWidth={1.75} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-ink text-sm font-medium truncate">{doc.title || doc.original_filename}</p>
          {doc.notes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <StickyNote className="w-3.5 h-3.5 text-faint flex-shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-ink text-white text-xs">{doc.notes}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-faint text-xs truncate sm:hidden">
          {formatBytes(doc.file_size)} · {uploadedDate}
          {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ""}
        </p>
      </div>

      <span className={`${categoryPillClasses(doc.category)} justify-self-start hidden sm:inline-flex`}>
        {doc.category || "Other"}
      </span>

      <span className="text-muted text-xs whitespace-nowrap hidden sm:block">{formatBytes(doc.file_size)}</span>

      <div className="min-w-0 hidden sm:block">
        <p className="text-muted text-xs truncate">{uploadedDate}</p>
        {doc.uploaded_by_name && <p className="text-faint text-[11px] truncate">by {doc.uploaded_by_name}</p>}
      </div>

      <div className="flex items-center gap-0.5 justify-self-end">
        <button
          type="button"
          onClick={() => window.open(doc.file_url, "_blank", "noopener")}
          className="p-2 rounded-lg text-faint hover:text-primary hover:bg-primary-soft transition-colors"
          title="Open / download"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg text-faint hover:text-ink hover:bg-black/[0.04] transition-colors"
          title="Edit details"
        >
          <Pencil className="w-4 h-4" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClientDocuments() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [pendingFiles, setPendingFiles] = useState(null); // File[] awaiting the upload dialog
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-updated_date", 2000),
  });

  const client = clients.find((c) => c.id === clientId);

  const clientDocs = useMemo(
    () =>
      documents
        .filter((d) => d.client_id === clientId)
        .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")),
    [documents, clientId]
  );

  // Only show category chips for categories actually in use.
  const categoriesInUse = useMemo(() => {
    const set = new Set(clientDocs.map((d) => d.category || "Other"));
    return ["All", ...[...set].sort()];
  }, [clientDocs]);

  const filtered = clientDocs.filter((d) => {
    const matchesCategory = categoryFilter === "All" || (d.category || "Other") === categoryFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.title?.toLowerCase().includes(q) ||
      d.original_filename?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete document"),
  });

  const handleFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setPendingFiles(files);
    e.target.value = "";
  };

  const canDelete = (doc) => isAdmin || doc.created_by === user?.email;

  const isLoading = loadingClients || loadingDocs;

  if (!isLoading && !client) {
    return (
      <EmptyState
        icon={FileText}
        title="Client not found"
        description="This client may have been removed."
        action={() => navigate("/documents")}
        actionLabel="Back to library"
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/documents")}
              className="p-2 rounded-xl text-muted hover:text-ink hover:bg-black/[0.03] transition-colors flex-shrink-0"
              title="Back to library"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-ink tracking-tight truncate">
                {client?.name || "…"}
              </h1>
              <p className="text-muted text-sm mt-0.5">
                {clientDocs.length === 0
                  ? "No documents yet"
                  : `${clientDocs.length} document${clientDocs.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary hover:bg-primary-hover text-white border-0 rounded-xl px-5 h-10 text-sm font-medium shadow-lg shadow-primary/20 transition-all duration-200"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesPicked}
          />
        </div>

        {/* Filters */}
        {clientDocs.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {categoriesInUse.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? "bg-primary text-white"
                      : "bg-surface border border-line text-muted hover:text-ink"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative sm:ml-auto sm:w-64">
              <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="pl-9 bg-surface border-line text-ink placeholder:text-faint rounded-xl h-9"
              />
            </div>
          </div>
        )}

        {/* Document list */}
        {isLoading ? (
          <ShimmerCard count={4} />
        ) : clientDocs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description={`Upload presentations, fact sheets, rates and more for ${client?.name}.`}
            action={() => fileInputRef.current?.click()}
            actionLabel="Upload files"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="No documents match your search or filter. Try clearing them."
          />
        ) : (
          <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden">
            {filtered.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                canDelete={canDelete(doc)}
                onEdit={() => setEditing(doc)}
                onDelete={() => setConfirmDelete(doc)}
              />
            ))}
          </div>
        )}

        {/* Upload dialog */}
        {pendingFiles && client && (
          <DocumentUploadDialog
            open
            onClose={() => setPendingFiles(null)}
            client={client}
            files={pendingFiles}
          />
        )}

        {/* Edit dialog */}
        {editing && (
          <EditDocumentDialog
            key={editing.id}
            open
            onClose={() => setEditing(null)}
            document={editing}
          />
        )}

        {/* Delete confirm */}
        <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
          <AlertDialogContent className="bg-surface border-line text-ink">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document?</AlertDialogTitle>
              <AlertDialogDescription>
                “{confirmDelete?.title || confirmDelete?.original_filename}” will be removed from {client?.name}'s library. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-danger hover:bg-danger/90 text-white rounded-xl"
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
