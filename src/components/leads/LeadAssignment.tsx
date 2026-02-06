import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  full_name: string;
}

interface LeadAssignmentProps {
  leadId: string;
  companyId: string;
  currentAssignedTo: string | null;
  onUpdate: (assignedTo: string | null) => void;
}

export function LeadAssignment({ leadId, companyId, currentAssignedTo, onUpdate }: LeadAssignmentProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [companyId]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    // Fetch users associated with this company
    const { data: companyUsers } = await supabase
      .from("client_companies")
      .select("user_id")
      .eq("company_id", companyId);

    if (companyUsers && companyUsers.length > 0) {
      const userIds = companyUsers.map((cu) => cu.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (profilesData) {
        setProfiles(profilesData as Profile[]);
      }
    }

    // Also try to fetch all profiles for admin users
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name");
    if (allProfiles && allProfiles.length > 0) {
      // Merge without duplicates
      setProfiles((prev) => {
        const existing = new Set(prev.map((p) => p.user_id));
        const merged = [...prev];
        allProfiles.forEach((p) => {
          if (!existing.has(p.user_id)) {
            merged.push(p as Profile);
          }
        });
        return merged;
      });
    }

    setLoading(false);
  };

  const handleAssign = async (userId: string) => {
    setUpdating(true);
    const assignedTo = userId === "unassigned" ? null : userId;
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: assignedTo })
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao atribuir responsável");
    } else {
      onUpdate(assignedTo);
      toast.success(assignedTo ? "Responsável atribuído!" : "Responsável removido");
    }
    setUpdating(false);
  };

  const assignedProfile = profiles.find((p) => p.user_id === currentAssignedTo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserCheck className="h-4 w-4 text-primary" />
        Responsável
      </h4>

      <Select
        value={currentAssignedTo || "unassigned"}
        onValueChange={handleAssign}
        disabled={updating}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Selecionar responsável..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <span className="text-muted-foreground">Sem responsável</span>
          </SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.user_id} value={p.user_id}>
              {p.full_name || "Sem nome"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {assignedProfile && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{assignedProfile.full_name}</span>
        </div>
      )}
    </div>
  );
}
