import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Session-driven account affordance: avatar + display name, rename, sign out.
 * Renders nothing until the session is known.
 */
export function AccountMenu({ className }: { className?: string }) {
  const user = useSessionUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (renameOpen) setNewName(profile?.display_name ?? "");
  }, [renameOpen, profile?.display_name]);

  if (!user) return null;

  const name = profile?.display_name || user.email?.split("@")[0] || "You";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const handleSignOut = async () => {
    // Sign-out hygiene: stop in-flight queries, drop cached protected data,
    // clear the session, then leave via REPLACE so Back can't restore it.
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save the name. Try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Name updated");
    setRenameOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2.5 rounded-xl px-2 py-1.5 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
            aria-label="Account menu"
          >
            <Avatar className="size-7">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={name} />
              ) : null}
              <AvatarFallback className="bg-primary/15 font-display text-xs font-bold text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-28 truncate font-mono text-[11px] uppercase tracking-wider sm:inline">
              {name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate font-display text-sm font-semibold">{name}</span>
            <span className="truncate font-mono text-[10px] font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="size-4" /> Edit display name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Edit display name</DialogTitle>
            <DialogDescription>Shown on your account and recordings.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRename();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRename()} disabled={saving || !newName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
