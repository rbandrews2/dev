export function getInstallationId(): string {
  const KEY = "wzos_installation_id";

  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
