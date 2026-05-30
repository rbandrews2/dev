import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Organization = {
  id: string;
  name: string;
  activation_code_id?: string | null;
};

type OrgMembership = {
  organization_id: string;
  role: string;
  company_size?: string | null;
  email?: string | null;
  organization?: Organization | null;
};

type AuthContextValue = {
  user: any | null;
  session: any | null;
  loading: boolean;
  loadingAuth: boolean;
  organization: Organization | null;
  activeOrgRole: string | null;
  isAdmin: boolean;
  profile?: any | null;
  userProfile?: any | null;
  signOut: () => Promise<void>;
  isAuthed: boolean;
  orgMemberships: OrgMembership[];
  activeOrgId: string | null;
  setActiveOrgId: (orgId: string | null) => void;
  refreshOrganization: () => Promise<OrgMembership[]>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  loadingAuth: true,
  organization: null,
  isAdmin: false,
  signOut: async () => {},
  isAuthed: false,
  orgMemberships: [],
  activeOrgId: null,
  setActiveOrgId: () => {},
  refreshOrganization: async () => [],
  activeOrgRole: null,
});

export const useAuth = () => useContext(AuthContext);

const ACTIVE_ORG_STORAGE_KEY = "wzos_active_org_id";

const saveActiveOrg = (orgId: string | null) => {
  try {
    if (orgId) {
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
    } else {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Could not persist active org", err);
  }
};

const loadStoredActiveOrg = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  } catch (err) {
    console.warn("Could not load active org", err);
    return null;
  }
};

async function loadOrgMemberships(user: any): Promise<OrgMembership[]> {
  try {
    if (!user?.id && !user?.email) {
      return [];
    }

    const normalizedEmail =
      typeof user?.email === "string" ? user.email.trim().toLowerCase() : null;

    const membershipRows = new Map<string, OrgMembership>();

    if (user?.id) {
      const { data: byUserId, error: byUserIdError } = await supabase
        .from("organization_members")
        .select("organization_id, role, email, company_size")
        .eq("user_id", user.id);

      if (byUserIdError) {
        console.error("Error loading org memberships by user id:", byUserIdError);
      } else {
        for (const membership of byUserId ?? []) {
          membershipRows.set(
            membership.organization_id,
            membership as OrgMembership
          );
        }
      }
    }

    if (normalizedEmail) {
      const { data: byEmail, error: byEmailError } = await supabase
        .from("organization_members")
        .select("organization_id, role, email, company_size")
        .eq("email", normalizedEmail);

      if (byEmailError) {
        console.error("Error loading org memberships by email:", byEmailError);
      } else {
        for (const membership of byEmail ?? []) {
          membershipRows.set(
            membership.organization_id,
            membership as OrgMembership
          );
        }
      }
    }

    const resolvedMemberships = Array.from(membershipRows.values());

    if (resolvedMemberships.length === 0) {
      return [];
    }

    const orgIds = resolvedMemberships.map((m) => m.organization_id).filter(Boolean);
    if (orgIds.length === 0) {
      return resolvedMemberships;
    }

    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, activation_code_id")
      .in("id", orgIds);

    if (orgError) {
      console.error("Error loading organization:", orgError);
      return resolvedMemberships;
    }

    const orgMap = new Map(orgs?.map((org) => [org.id, org]) ?? []);

    return resolvedMemberships.map((membership) => ({
      ...membership,
      organization: orgMap.get(membership.organization_id) ?? null,
    }));
  } catch (err) {
    console.error("loadOrgAndRole failed:", err);
    return [];
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [activeOrgRole, setActiveOrgRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    const syncOrgState = (memberships: OrgMembership[], preferredActiveId?: string | null) => {
      const storedActive = preferredActiveId ?? loadStoredActiveOrg();
      const activeFromList =
        memberships.find((m) => m.organization_id === storedActive) || memberships[0];
      const fallbackActive = activeFromList?.organization_id ?? null;

      setOrgMemberships(memberships);
      setActiveOrgIdState(fallbackActive);
      saveActiveOrg(fallbackActive);
      setActiveOrgRole(activeFromList?.role ?? null);

      if (fallbackActive) {
        const match =
          memberships.find((m) => m.organization_id === fallbackActive) ?? memberships[0];
        const org = match?.organization ?? null;
        setOrganization(org ? { id: org.id, name: org.name, activation_code_id: org.activation_code_id } : match ? { id: match.organization_id, name: "Organization" } : null);
        setIsAdmin(Boolean(match && (match.role === "owner" || match.role === "admin")));
      } else {
        setOrganization(null);
        setIsAdmin(false);
        setActiveOrgRole(null);
      }
    };

    const loadProfile = async (userId: string) => {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (!isMounted) return;
        setProfile(prof ?? null);
        setUserProfile(prof ?? null);
      } catch (err) {
        console.error("Error loading profile:", err);
        if (!isMounted) return;
        setProfile(null);
        setUserProfile(null);
      }
    };

    const loadForUser = async (nextUser: any, nextSession: any) => {
      setUser(nextUser);
      setSession(nextSession);
      const memberships = await loadOrgMemberships(nextUser);
      if (!isMounted) return;
      syncOrgState(memberships);
      if (nextUser?.id) {
        await loadProfile(nextUser.id);
      }
    };

    const init = async () => {
      setLoading(true);

      if (!isSupabaseConfigured) {
        setUser(null);
        setSession(null);
        setOrganization(null);
        setIsAdmin(false);
        setProfile(null);
        setUserProfile(null);
        setOrgMemberships([]);
        setActiveOrgIdState(null);
        saveActiveOrg(null);
        setActiveOrgRole(null);
        setLoading(false);
        return undefined;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error || !data?.session?.user) {
        setUser(null);
        setSession(null);
        setOrganization(null);
        setIsAdmin(false);
        setProfile(null);
        setUserProfile(null);
        setOrgMemberships([]);
        setActiveOrgIdState(null);
        saveActiveOrg(null);
        setLoading(false);
      } else {
        await loadForUser(data.session.user, data.session);
        if (!isMounted) return;
        setLoading(false);
      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          const nextUser = session?.user ?? null;
          if (!isMounted) return;

          if (nextUser) {
            await loadForUser(nextUser, session);

            if (event === "SIGNED_IN") {
              toast.success("You are now logged in", {
                description: nextUser.email ?? undefined,
              });
            }
            if (event === "USER_UPDATED") {
              toast.success("You successfully created an account", {
                description: nextUser.email ?? undefined,
              });
            }
          } else {
            setOrganization(null);
            setIsAdmin(false);
            setProfile(null);
            setUserProfile(null);
            setSession(null);
            setOrgMemberships([]);
            setActiveOrgIdState(null);
            saveActiveOrg(null);
            setActiveOrgRole(null);
          }
        }
      );

      return () => {
        listener.subscription.unsubscribe();
      };
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetActiveOrgId = (orgId: string | null, membershipsOverride?: OrgMembership[]) => {
    const sourceMemberships = membershipsOverride ?? orgMemberships;
    setActiveOrgIdState(orgId);
    saveActiveOrg(orgId);
    const match =
      sourceMemberships.find((m) => m.organization_id === orgId) ?? sourceMemberships[0];
    if (match) {
      const org = match.organization ?? null;
      setOrganization(
        org ? { id: org.id, name: org.name, activation_code_id: org.activation_code_id } : { id: match.organization_id, name: "Organization" }
      );
      setIsAdmin(Boolean(match.role === "owner" || match.role === "admin"));
      setActiveOrgRole(match.role ?? null);
    } else {
      setOrganization(null);
      setIsAdmin(false);
      setActiveOrgRole(null);
    }
  };

  const refreshOrganization = async (): Promise<OrgMembership[]> => {
    if (!user?.id) return [];
    const memberships = await loadOrgMemberships(user);
    setOrgMemberships(memberships);
    const stored = loadStoredActiveOrg();
    const active =
      memberships.find((m) => m.organization_id === stored) ??
      memberships[0];
    const resolvedActiveId = active?.organization_id ?? null;
    handleSetActiveOrgId(resolvedActiveId, memberships);
    setActiveOrgRole(active?.role ?? null);
    return memberships;
  };

  const value: AuthContextValue = {
    user,
    loading,
    organization,
    isAdmin,
    activeOrgRole,
    orgMemberships,
    activeOrgId,
    setActiveOrgId: handleSetActiveOrgId,
    refreshOrganization,
    profile,
    userProfile,
    session,
    loadingAuth: loading,
    isAuthed: Boolean(user),
    signOut: async () => {
      try {
        if (!isSupabaseConfigured) {
          setUser(null);
          setSession(null);
          setOrganization(null);
          setIsAdmin(false);
          setProfile(null);
          setUserProfile(null);
          setOrgMemberships([]);
          setActiveOrgIdState(null);
          saveActiveOrg(null);
          setActiveOrgRole(null);
          return;
        }

        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setOrganization(null);
        setIsAdmin(false);
        setProfile(null);
        setUserProfile(null);
        setOrgMemberships([]);
        setActiveOrgIdState(null);
        saveActiveOrg(null);
        setActiveOrgRole(null);
        toast.success("Signed out");
      } catch (err) {
        console.error("Sign out failed:", err);
        toast.error("Unable to sign out. Please try again.");
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
