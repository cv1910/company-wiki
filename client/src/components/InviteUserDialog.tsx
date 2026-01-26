import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Copy, Check, Mail, Loader2 } from "lucide-react";
import { toast } from "@/lib/hapticToast";
import { trpc } from "@/lib/trpc";
import { getSignUpUrl } from "@/const";

interface InviteUserDialogProps {
  trigger?: React.ReactNode;
}

export function InviteUserDialog({ trigger }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "editor" | "admin">("user");
  const [copied, setCopied] = useState(false);

  // Get the signup URL for the invite link (allows new users to register)
  const inviteLink = typeof window !== "undefined" ? getSignUpUrl() : "";

  const inviteMutation = trpc.users.invite.useMutation({
    onSuccess: () => {
      toast.success("Einladung wurde gesendet!");
      setEmail("");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Einladung konnte nicht gesendet werden");
    },
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const handleSendInvite = () => {
    if (!email) {
      toast.error("Bitte E-Mail-Adresse eingeben");
      return;
    }
    
    inviteMutation.mutate({
      email,
      role,
      inviteLink,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Benutzer einladen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Benutzer einladen</DialogTitle>
          <DialogDescription>
            Lade neue Benutzer zum Company Wiki ein. Nach der Anmeldung mit Google erhalten sie automatisch Zugang.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Invite Link Section */}
          <div className="space-y-2">
            <Label>Einladungslink</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                title="Link kopieren"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Teile diesen Link mit Personen, die Zugang erhalten sollen.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                oder per E-Mail einladen
              </span>
            </div>
          </div>

          {/* Email Invite Section */}
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Vorgeschlagene Rolle</Label>
            <Select 
              value={role} 
              onValueChange={(v) => setRole(v as typeof role)}
              disabled={inviteMutation.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Benutzer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Die Rolle kann nach der Anmeldung in der Benutzerverwaltung angepasst werden.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={inviteMutation.isPending}>
            Abbrechen
          </Button>
          <Button onClick={handleSendInvite} disabled={!email || inviteMutation.isPending}>
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Einladung senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
