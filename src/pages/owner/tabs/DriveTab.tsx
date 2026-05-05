import { useEffect, useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

export default function DriveTab() {
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ drive_folder_id: string | null; drive_folder_name: string | null } | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  useEffect(() => {
    (async () => {
      try {
        const res = await ownerAdmin<{ ok: true; settings: any }>("drive.get");
        setSettings(res.settings);
      } catch (e: any) {
        setErr(e.message || "Failed to load Drive settings.");
      }
    })();
  }, []);

  async function loadScript(src: string) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  async function ensureGoogleLoaded() {
    // GIS + Picker + GAPI
    if (!document.querySelector('script[src^="https://accounts.google.com/gsi/client"]')) {
      await loadScript("https://accounts.google.com/gsi/client");
    }
    if (!document.querySelector('script[src^="https://apis.google.com/js/api.js"]')) {
      await loadScript("https://apis.google.com/js/api.js");
    }
  }

  async function pickFolder() {
    setErr(null);

    if (!googleClientId || !googleApiKey) {
      setErr("Missing VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_API_KEY.");
      return;
    }

    try {
      await ensureGoogleLoaded();

      // Init gapi client
      await new Promise<void>((resolve) => {
        window.gapi.load("client:picker", async () => {
          await window.gapi.client.init({
            apiKey: googleApiKey,
            discoveryDocs: [DISCOVERY_DOC],
          });
          resolve();
        });
      });

      // Request access token (GIS)
      const token = await new Promise<string>((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: DRIVE_SCOPE,
          callback: (resp: any) => {
            if (resp?.access_token) resolve(resp.access_token);
            else reject(new Error("No access token returned"));
          },
        });
        client.requestAccessToken();
      });

      // Build folder picker
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(token)
        .setDeveloperKey(googleApiKey)
        .setTitle("Select a Drive folder for WZOS exports")
        .addView(view)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            const folderId = doc?.id ?? null;
            const folderName = doc?.name ?? null;

            await ownerAdmin("drive.set", { drive_folder_id: folderId, drive_folder_name: folderName });
            setSettings({ drive_folder_id: folderId, drive_folder_name: folderName });
          }
        })
        .build();

      picker.setVisible(true);
    } catch (e: any) {
      setErr(e.message || "Drive picker failed.");
    }
  }

  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded border border-red-800 bg-red-950/40 text-sm text-red-200">{err}</div>}

      <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="font-semibold">Google Drive Export Target</div>
        <div className="text-xs text-zinc-400 mt-1">
          Choose a folder where owner exports (reports, logs, customer docs) will be stored.
        </div>

        <div className="mt-3 text-sm">
          Current folder:{" "}
          {settings?.drive_folder_id ? (
            <span className="text-emerald-300">
              {settings.drive_folder_name ?? "Selected"} ({settings.drive_folder_id})
            </span>
          ) : (
            <span className="text-zinc-500">Not set</span>
          )}
        </div>

        <div className="mt-3">
          <button className="BtnPrimary" onClick={pickFolder}>
            Connect & Select Folder
          </button>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Required env vars: VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY.
        </div>
      </div>

      <style>{`
        .BtnPrimary{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.45);border-radius:.5rem;padding:.55rem .8rem;font-size:.85rem}
        .BtnPrimary:hover{background:rgba(16,185,129,.22)}
      `}</style>
    </div>
  );
}
