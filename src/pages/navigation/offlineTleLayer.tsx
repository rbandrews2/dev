export async function saveOfflineMap(state: string) {
  if (!window.showSaveFilePicker) {
    throw new Error("File System Access API is not available in this browser.");
  }

  const url = `https://superiorllc.org/offline-maps/${state}.mbtiles`;

  const resp = await fetch(url);
  const blob = await resp.blob();

  const handle = await window.showSaveFilePicker({
    suggestedName: `${state}.mbtiles`,
    types: [{ description: "MBTiles Map", accept: { "application/mbtiles": [".mbtiles"] } }],
  });

  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();

  return true;
}
