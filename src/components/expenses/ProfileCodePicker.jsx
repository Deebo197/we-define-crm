import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PAID_BY_CODES } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";

export default function ProfileCodePicker({ currentCode, currentPersonalCode, collapsed = false }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(currentCode || "");
  const [personalCode, setPersonalCode] = useState(currentPersonalCode || "");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ paid_by_code: code, paid_by_code_personal: personalCode });
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    setSaving(false);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-ink hover:bg-black/[0.03] transition-all w-full"
        title="Link your account to your expense paid-by codes"
      >
        <Settings className="w-[18px] h-[18px] flex-shrink-0 text-faint" />
        {!collapsed && <span>Expense Profile</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link Staff Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Link your account to your staff codes so expenses are attributed correctly.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Card Code <span className="text-xs text-muted-foreground">(no reimbursement)</span></Label>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company card code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— None —</SelectItem>
                  {PAID_BY_CODES.filter(p => !p.reimbursement).map(p => (
                    <SelectItem key={p.code} value={p.code}>{p.code} — {p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Personal Code <span className="text-xs text-muted-foreground">(reimbursement required)</span></Label>
              <Select value={personalCode} onValueChange={setPersonalCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select personal code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— None —</SelectItem>
                  {PAID_BY_CODES.filter(p => p.reimbursement).map(p => (
                    <SelectItem key={p.code} value={p.code}>{p.code} — {p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}