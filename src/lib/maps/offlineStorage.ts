import { openDB } from "idb";
import { securityV2 } from "@/lib/security";

const DB_NAME = "wzos-offline-maps";
const STORE = "states";

export function getStates() {
  return [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
    "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
    "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
    "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
    "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
  ];
}

async function db() {
  return await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    }
  });
}

export async function downloadStateMap(state: string) {
  const url = `https://github.com/OpenDataUSA/state-maps/raw/main/${state.replace(" ", "_")}.gpkg`;

  const response = await securityV2.secureFetch(url);
  const blob = await response.blob();

  const database = await db();
  await database.put(STORE, blob, state);
}

export async function listStoredStates(): Promise<string[]> {
  const database = await db();
  return await database.getAllKeys(STORE) as string[];
}
