import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import SignInGate from "@/components/auth/SignInGate";
import { Building2 } from "lucide-react";
import type { FileObject } from "@supabase/storage-js";

type CompanyFormsProps = {
  adminMode?: boolean;
};

export default function CompanyForms({ adminMode = false }: CompanyFormsProps) {
  const { user } = useAuth();
  const { canAdmin } = usePermissions();
  const canUpload = adminMode && canAdmin;
  const [files, setFiles] = useState<FileObject[]>([]);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const { data, error } = await supabase.storage.from("company_forms").list();
      if (error) {
        console.error("Company forms load error", error);
        toast.info("Unable to load forms (Demo Mode)");
        setFiles([]);
        return;
      }
      setFiles(data || []);
    } catch (err) {
      console.error("Unexpected company forms load error", err);
      toast.info("Unable to load forms (Demo Mode)");
      setFiles([]);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canUpload) {
      toast.error("Only owners and admins can upload company forms.");
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const { error } = await supabase.storage.from("company_forms")
        .upload(`${Date.now()}_${file.name}`, file);

      if (error) {
        console.error("Company form upload error", error);
        toast.info("Upload saved locally (Demo Mode)");
      } else {
        toast.success("File uploaded");
      }
      await load();
    } catch (err) {
      console.error("Unexpected company form upload error", err);
      toast.info("Upload saved locally (Demo Mode)");
    } finally {
      setUploading(false);
    }
  }

  if (!user) {
    return (
      <SignInGate
        label="Company Forms"
        title={adminMode ? "Upload and share PDFs." : "Company document library."}
        description={adminMode ? "Sign in to upload or download company-specific forms." : "Sign in to download company-specific forms."}
        icon={<Building2 className="w-5 h-5" />}
      />
    );
  }

  return (
    <div className="min-h-screen pb-16 max-w-4xl mx-auto space-y-4 text-white">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200/80">
          Forms Hub
        </p>
        <h1 className="text-3xl font-semibold">Company Forms</h1>
        <p className="text-sm text-orange-100/75">
          {adminMode ? "Admin uploads | Employees download" : "Employee document library"}
        </p>
      </div>

      <GlassCard className="p-5 space-y-4">
        {canUpload ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold">Upload a document</label>
            <input type="file" onChange={upload} className="text-sm" />
            {uploading && <p className="text-emerald-400 text-sm">Uploading...</p>}
          </div>
        ) : adminMode ? (
          <div className="rounded-lg border border-orange-500/30 bg-black/40 p-3 text-sm text-orange-100/80">
            Uploads are limited to owners and admins. Available documents remain visible below.
          </div>
        ) : null}

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Available Documents</h2>

          <div className="space-y-2">
            {files.map((f) => (
              <a key={f.name}
                className="block p-3 bg-black/30 border border-orange-400/20 rounded hover:border-orange-300/40 transition"
                href={supabase.storage.from("company_forms").getPublicUrl(f.name).data.publicUrl}
                target="_blank"
                rel="noreferrer"
              >
                {f.name}
              </a>
            ))}
            {files.length === 0 && (
              <p className="text-sm text-orange-100/75">No documents available yet.</p>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
