// Offline Maps via MBTiles (loaded dynamically to avoid build-time dependency)

export async function createOfflineLayer(file: File) {
  const url = URL.createObjectURL(file);

  // Keep the optional MBTiles dependency fully runtime-resolved so Vite
  // does not try to bundle sql.js into the main browser build.
  const specifier = "leaflet-tilelayer-mbtiles-ts";
  type MbTilesModule = {
    default?: new (url: string, options: Record<string, unknown>) => { addTo(map: unknown): unknown };
  };
  const dynamicImport = new Function("s", "return import(s)") as (s: string) => Promise<MbTilesModule>;
  const mod = await dynamicImport(specifier).catch(() => null);
  if (!mod) {
    console.warn("leaflet-tilelayer-mbtiles-ts not installed; offline layer unavailable");
    return null;
  }
  const MBTilesLayer = mod.default;
  if (!MBTilesLayer) {
    console.warn("leaflet-tilelayer-mbtiles-ts loaded without a default export; offline layer unavailable");
    return null;
  }

  return new MBTilesLayer(url, {
    minZoom: 5,
    maxZoom: 18,
    maxNativeZoom: 18,
    detectRetina: true,
  });
}

export async function pickOfflineMap(): Promise<File | null> {
  try {
    if (!window.showOpenFilePicker) {
      console.warn("showOpenFilePicker not supported in this browser");
      return null;
    }

    const handle = await window.showOpenFilePicker({
      types: [{ accept: { "application/mbtiles": [".mbtiles"] } }],
      excludeAcceptAllOption: true,
      multiple: false,
    });

    return await handle[0].getFile();
  } catch {
    return null;
  }
}

export async function getOfflineMapFile(
  input?: HTMLInputElement | null
): Promise<File | null> {
  if (!input || !input.files || input.files.length === 0) {
    return null;
  }

  return input.files[0];
}
