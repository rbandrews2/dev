export type IntegrationSecretCheck = {
  name: string;
  category: "core" | "bookkeeping" | "timekeeping" | "storage" | "client";
  provider: string;
  description: string;
  required: boolean;
  present: boolean;
  strength: "missing" | "weak" | "ok";
  clientVisible: boolean;
};

type SecretDescriptor = Omit<IntegrationSecretCheck, "present" | "strength"> & {
  minLength?: number;
};

export type IntegrationProviderStatus = {
  provider: string;
  category: "bookkeeping" | "timekeeping" | "storage";
  ready: boolean;
  missingSecrets: string[];
  missingClientConfig: string[];
  notes: string;
};

type IntegrationStatusSummary = {
  coreReady: boolean;
  bookkeepingReady: boolean;
  timekeepingReady: boolean;
  storageReady: boolean;
  customWebhookReady: boolean;
};

const SECRET_DESCRIPTORS: SecretDescriptor[] = [
  {
    name: "WZOS_WEBHOOK_SIGNING_SECRET",
    category: "core",
    provider: "wzos",
    description: "HMAC secret for signed outbound webhooks and internal API handoffs.",
    required: true,
    clientVisible: false,
    minLength: 32,
  },
  {
    name: "WZOS_VAULT_MASTER_KEY",
    category: "core",
    provider: "wzos",
    description: "Server-side encryption key for stored provider tokens and secret material.",
    required: true,
    clientVisible: false,
    minLength: 32,
  },
  {
    name: "SUPABASE_SECRET_KEYS",
    category: "core",
    provider: "supabase",
    description: "Privileged Supabase secret key required for owner/admin server operations.",
    required: true,
    clientVisible: false,
    minLength: 32,
  },
  {
    name: "QUICKBOOKS_CLIENT_ID",
    category: "bookkeeping",
    provider: "quickbooks",
    description: "OAuth client id for QuickBooks Online bookkeeping sync.",
    required: true,
    clientVisible: false,
  },
  {
    name: "QUICKBOOKS_CLIENT_SECRET",
    category: "bookkeeping",
    provider: "quickbooks",
    description: "OAuth client secret for QuickBooks Online bookkeeping sync.",
    required: true,
    clientVisible: false,
    minLength: 24,
  },
  {
    name: "QUICKBOOKS_WEBHOOK_VERIFIER",
    category: "bookkeeping",
    provider: "quickbooks",
    description: "Verifier used to validate QuickBooks webhook deliveries.",
    required: true,
    clientVisible: false,
    minLength: 24,
  },
  {
    name: "QUICKBOOKS_TIME_CLIENT_ID",
    category: "timekeeping",
    provider: "quickbooks-time",
    description: "OAuth client id for QuickBooks Time / TSheets sync.",
    required: true,
    clientVisible: false,
  },
  {
    name: "QUICKBOOKS_TIME_CLIENT_SECRET",
    category: "timekeeping",
    provider: "quickbooks-time",
    description: "OAuth client secret for QuickBooks Time / TSheets sync.",
    required: true,
    clientVisible: false,
    minLength: 24,
  },
  {
    name: "QUICKBOOKS_TIME_WEBHOOK_VERIFIER",
    category: "timekeeping",
    provider: "quickbooks-time",
    description: "Verifier used to validate QuickBooks Time webhook deliveries.",
    required: false,
    clientVisible: false,
    minLength: 24,
  },
  {
    name: "GOOGLE_DRIVE_CLIENT_SECRET",
    category: "storage",
    provider: "google-drive",
    description: "OAuth client secret for Google Drive token exchange.",
    required: true,
    clientVisible: false,
    minLength: 24,
  },
  {
    name: "MICROSOFT_GRAPH_CLIENT_SECRET",
    category: "storage",
    provider: "microsoft-storage",
    description: "OAuth client secret for SharePoint / OneDrive access via Microsoft Graph.",
    required: true,
    clientVisible: false,
    minLength: 24,
  },
  {
    name: "MICROSOFT_TENANT_ID",
    category: "storage",
    provider: "microsoft-storage",
    description: "Tenant binding for SharePoint / OneDrive integration.",
    required: true,
    clientVisible: false,
  },
  {
    name: "VITE_GOOGLE_CLIENT_ID",
    category: "client",
    provider: "google-drive",
    description: "Browser OAuth client id used by the Drive picker flow.",
    required: true,
    clientVisible: true,
  },
  {
    name: "VITE_GOOGLE_API_KEY",
    category: "client",
    provider: "google-drive",
    description: "Restricted browser API key used by the Drive picker flow.",
    required: true,
    clientVisible: true,
  },
  {
    name: "VITE_INTEGRATIONS_ENABLED",
    category: "client",
    provider: "wzos",
    description: "Feature flag that enables integrations in the browser UI.",
    required: true,
    clientVisible: true,
  },
];

function readEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

function strengthFor(value: string, minLength?: number): "missing" | "weak" | "ok" {
  if (!value) return "missing";
  if (minLength && value.length < minLength) return "weak";
  return "ok";
}

function configPresent(name: string): boolean {
  const value = readEnv(name);
  if (!value) return false;
  if (name === "VITE_INTEGRATIONS_ENABLED") return value.toLowerCase() === "true";
  return true;
}

function describe(name: string): IntegrationSecretCheck {
  const descriptor = SECRET_DESCRIPTORS.find((item) => item.name === name);
  if (!descriptor) {
    throw new Error(`Unknown integration secret descriptor: ${name}`);
  }
  const value = readEnv(name);
  return {
    ...descriptor,
    present: descriptor.clientVisible ? configPresent(name) : Boolean(value),
    strength: strengthFor(value, descriptor.minLength),
  };
}

function groupStatus(secretNames: string[], clientConfigNames: string[]): { ready: boolean; missingSecrets: string[]; missingClientConfig: string[] } {
  const secrets = secretNames.map(describe);
  const clientConfig = clientConfigNames.map(describe);
  const missingSecrets = secrets.filter((item) => item.required && item.strength !== "ok").map((item) => item.name);
  const missingClientConfig = clientConfig.filter((item) => item.required && configPresent(item.name) === false).map((item) => item.name);
  return {
    ready: missingSecrets.length === 0 && missingClientConfig.length === 0,
    missingSecrets,
    missingClientConfig,
  };
}

export function getIntegrationSecretChecks(): IntegrationSecretCheck[] {
  return SECRET_DESCRIPTORS.map((item) => describe(item.name));
}

export function getIntegrationProviderStatus(): IntegrationProviderStatus[] {
  const bookkeeping = groupStatus(
    ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET", "QUICKBOOKS_WEBHOOK_VERIFIER"],
    [],
  );
  const timekeeping = groupStatus(
    ["QUICKBOOKS_TIME_CLIENT_ID", "QUICKBOOKS_TIME_CLIENT_SECRET"],
    [],
  );
  const googleDrive = groupStatus(
    ["GOOGLE_DRIVE_CLIENT_SECRET"],
    ["VITE_GOOGLE_CLIENT_ID", "VITE_GOOGLE_API_KEY", "VITE_INTEGRATIONS_ENABLED"],
  );
  const microsoftStorage = groupStatus(
    ["MICROSOFT_GRAPH_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
    ["VITE_INTEGRATIONS_ENABLED"],
  );

  return [
    {
      provider: "quickbooks",
      category: "bookkeeping",
      ready: bookkeeping.ready,
      missingSecrets: bookkeeping.missingSecrets,
      missingClientConfig: bookkeeping.missingClientConfig,
      notes: "Recommended bookkeeping baseline for invoices, customers, and chart-of-accounts exports.",
    },
    {
      provider: "quickbooks-time",
      category: "timekeeping",
      ready: timekeeping.ready,
      missingSecrets: timekeeping.missingSecrets,
      missingClientConfig: timekeeping.missingClientConfig,
      notes: "Recommended timekeeping baseline for timesheets, crew hours, and payroll-ready exports.",
    },
    {
      provider: "google-drive",
      category: "storage",
      ready: googleDrive.ready,
      missingSecrets: googleDrive.missingSecrets,
      missingClientConfig: googleDrive.missingClientConfig,
      notes: "Current codebase already includes a browser-side Drive folder picker for owner/admin use.",
    },
    {
      provider: "microsoft-storage",
      category: "storage",
      ready: microsoftStorage.ready,
      missingSecrets: microsoftStorage.missingSecrets,
      missingClientConfig: microsoftStorage.missingClientConfig,
      notes: "Covers SharePoint and OneDrive via Microsoft Graph for documents and compliance storage.",
    },
  ];
}

export function getIntegrationStatus(): {
  secrets: IntegrationSecretCheck[];
  providers: IntegrationProviderStatus[];
  summary: IntegrationStatusSummary;
} {
  const secrets = getIntegrationSecretChecks();
  const providers = getIntegrationProviderStatus();
  const coreRequired = secrets.filter((item) => item.category === "core" && item.required);
  const providerMap = new Map(providers.map((provider) => [provider.provider, provider]));

  return {
    secrets,
    providers,
    summary: {
      coreReady: coreRequired.every((item) => item.strength === "ok"),
      bookkeepingReady: providerMap.get("quickbooks")?.ready ?? false,
      timekeepingReady: providerMap.get("quickbooks-time")?.ready ?? false,
      storageReady: (providerMap.get("google-drive")?.ready ?? false) || (providerMap.get("microsoft-storage")?.ready ?? false),
      customWebhookReady: describe("WZOS_WEBHOOK_SIGNING_SECRET").strength === "ok",
    },
  };
}
