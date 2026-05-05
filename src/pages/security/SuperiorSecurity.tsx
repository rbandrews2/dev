import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Radar,
  ServerCog,
  Shield,
  ShieldCheck,
  ShieldQuestion,
  UploadCloud,
} from "lucide-react";
import {
  SuperiorSecurity,
  type SecurityEvent,
  type PasswordStrengthResult,
} from "@/lib/security/superiorSecurity";
import { wzosTheme } from "@/theme/wzosTheme";

type Tab = "overview" | "testing" | "logs";
type TestType = "xss" | "password" | "sql" | "rateLimit" | "csrf" | "encryption" | "supabase";

type TestResult = {
  test: string;
  passed: boolean;
  message: string;
  detail?: string;
  meta?: Record<string, string | number | boolean>;
};

const cardBase =
  "rounded-2xl border border-amber-500/25 bg-gradient-to-br from-black/70 via-zinc-950 to-black shadow-[0_0_26px_rgba(0,0,0,0.45)]";

const StatCard = ({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number | string;
  icon: JSX.Element;
  accent: string;
}) => (
  <div className={`${cardBase} p-5 flex items-center justify-between`}>
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">{title}</p>
      <p className="text-3xl font-semibold text-white mt-1">{value}</p>
    </div>
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
  </div>
);

const SectionCard = ({
  title,
  icon,
  children,
  tone = "default",
}: {
  title: string;
  icon: JSX.Element;
  children: React.ReactNode;
  tone?: "default" | "success";
}) => (
  <div
    className={`${cardBase} p-6 ${tone === "success" ? "border-green-500/30 bg-gradient-to-br from-green-900/10 via-black to-black" : ""}`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-200">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
    </div>
    {children}
  </div>
);

const badgeStyles = {
  high: "bg-red-900/40 text-red-200 border border-red-500/30",
  medium: "bg-orange-900/30 text-orange-200 border border-orange-400/30",
  low: "bg-amber-500/15 text-amber-100 border border-amber-400/30",
};

export default function SuperiorSecurityPage() {
  const security = useMemo(() => new SuperiorSecurity(), []);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [testInput, setTestInput] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [securityLog, setSecurityLog] = useState<SecurityEvent[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const stats = security.getSecurityStats();
  const threatLevel: "green" | "yellow" | "red" =
    stats.high > 0 ? "red" : stats.medium > 0 ? "yellow" : "green";

  useEffect(() => {
    setSecurityLog(security.getSecurityLog());
  }, [security]);

  const runSecurityTest = (testType: TestType) => {
    let result: TestResult;

    switch (testType) {
      case "xss": {
        const sanitized = security.sanitizeInput(testInput);
        result = {
          test: "XSS Protection",
          passed: sanitized === testInput ? !testInput.includes("<") : true,
          message: "Input sanitized against script injection",
          detail: sanitized,
        };
        break;
      }
      case "password": {
        const validation: PasswordStrengthResult = security.validatePasswordStrength(testPassword);
        result = {
          test: "Password Strength",
          passed: validation.isValid,
          message: validation.isValid ? "Password meets strength policy" : "Password needs more entropy",
          meta: {
            strength: validation.strength,
            score: `${validation.score}/5`,
          },
        };
        break;
      }
      case "sql": {
        const isValid = security.validateSQLParams({ query: sqlQuery });
        result = {
          test: "SQL Injection Filter",
          passed: isValid,
          message: isValid ? "No injection patterns detected" : "Blocked potential SQL injection",
          detail: sqlQuery,
        };
        break;
      }
      case "rateLimit": {
        const allowed = security.checkRateLimit("demo_user", 5, 10_000);
        result = {
          test: "Rate Limiting",
          passed: allowed,
          message: allowed ? "Request allowed" : "Throttled to prevent abuse",
        };
        break;
      }
      case "csrf": {
        const token = security.generateCSRFToken(sessionId);
        const valid = security.validateCSRFToken(sessionId, token);
        result = {
          test: "CSRF Token Validation",
          passed: valid,
          message: "Token generated and validated",
          detail: token.slice(0, 24) + "…",
        };
        break;
      }
      case "encryption": {
        const data = { sensitive: "confidential data", userId: 12345 };
        const encrypted = security.encryptData(data);
        const decrypted = security.decryptData<typeof data>(encrypted);
        result = {
          test: "Data Encryption",
          passed: JSON.stringify(decrypted) === JSON.stringify(data),
          message: "Payload encrypted and decrypted",
          detail: encrypted.slice(0, 40) + "…",
        };
        break;
      }
      case "supabase": {
        const supabaseUrl = "https://example.supabase.co/rest/v1/users";
        const isTrusted = security.isTrustedSource(supabaseUrl);
        const headersValid = security.validateSupabaseRequest({
          apikey: "demo-key",
          authorization: "Bearer token",
        });
        result = {
          test: "Supabase Whitelist",
          passed: isTrusted && headersValid,
          message: "Supabase traffic allowed without breaking protection",
          meta: { trusted: isTrusted, headers: headersValid },
        };
        break;
      }
      default:
        return;
    }

    security.logSecurityEvent(`TEST_${testType.toUpperCase()}`, { passed: result.passed });
    setTestResults((prev) => [result, ...prev].slice(0, 5));
    setSecurityLog(security.getSecurityLog());
  };

  return (
    <div className="space-y-8 text-amber-50">
      <div
        className={`${cardBase} p-6 border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-black to-black flex flex-col gap-4`}
        style={{ boxShadow: `${wzosTheme.glowShadow}, 0 30px 60px rgba(0,0,0,0.45)` }}
      >
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-100 shadow-lg shadow-amber-500/20 overflow-hidden">
              <img
                src="/superior-security-shield.png"
                alt="Superior Security Software"
                className="h-12 w-12 object-contain"
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Security Layer</p>
              <h1 className="text-3xl font-bold text-white leading-tight">Superior Security Dashboard</h1>
              <p className="text-sm text-amber-100/80">
                Anti-malware, anti-phishing, and anti-hacker controls tuned for Work Zone OS.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-medium">Live protection</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.6)] ${
                  threatLevel === "green" ? "bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.9)]" : "bg-emerald-900/50"
                }`}
                title="Safe"
              />
              <span
                className={`h-3 w-3 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.6)] ${
                  threatLevel === "yellow" ? "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.9)]" : "bg-amber-900/40"
                }`}
                title="Warning"
              />
              <span
                className={`h-3 w-3 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.6)] ${
                  threatLevel === "red" ? "bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]" : "bg-red-900/40"
                }`}
                title="Critical"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatCard
            title="Events Monitored"
            value={stats.total}
            accent="bg-amber-500/15"
            icon={<Shield className="h-6 w-6 text-amber-200" />}
          />
          <StatCard
            title="High Severity"
            value={stats.high}
            accent="bg-red-500/20"
            icon={<AlertTriangle className="h-6 w-6 text-red-200" />}
          />
          <StatCard
            title="Medium Severity"
            value={stats.medium}
            accent="bg-orange-500/20"
            icon={<ShieldQuestion className="h-6 w-6 text-orange-200" />}
          />
          <StatCard
            title="Low Severity"
            value={stats.low}
            accent="bg-amber-500/15"
            icon={<CheckCircle2 className="h-6 w-6 text-amber-100" />}
          />
        </div>
      </div>

      <div className="flex gap-2 bg-black/50 border border-amber-500/20 rounded-xl p-1 w-full overflow-x-auto">
        {(["overview", "testing", "logs"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[140px] px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_24px_rgba(250,204,21,0.35)]"
                : "text-amber-100/80 hover:text-amber-50 hover:bg-amber-500/10"
            }`}
          >
            {tab === "overview" && "Coverage"}
            {tab === "testing" && "Testing Suite"}
            {tab === "logs" && "Event Log"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <SectionCard
            title="Supabase Integration Protected"
            icon={<ServerCog className="h-6 w-6" />}
            tone="success"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-100/80">Trusted domain whitelist</p>
                  <p className="text-xs text-amber-100/70">*.supabase.co / supabase.com / supabase.io</p>
                </div>
                <span className="text-sm font-semibold text-emerald-200">Active</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {["Auth API", "Database", "Storage", "Realtime"].map((service) => (
                  <div
                    key={service}
                    className="rounded-lg border border-amber-500/20 bg-black/60 px-3 py-2 flex items-center justify-between"
                  >
                    <span className="text-amber-50">{service}</span>
                    <span className="text-emerald-200 text-xs">Secured</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/80">
                Supabase traffic bypasses throttling while headers and origins stay validated.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Security Controls" icon={<Shield className="h-6 w-6" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-amber-100/80">
              {[
                "XSS sanitation on all inputs",
                "SQL injection pattern filtering",
                "CSRF token generation/validation",
                "Rate limiting and DDoS defense",
                "Password strength policy",
                "File upload validation",
                "Data encryption at rest in-app",
                "Event severity tracking",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-black/50 px-3 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Events" icon={<Radar className="h-6 w-6" />}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {securityLog.length === 0 && (
                <p className="text-amber-100/60 text-sm text-center py-6">No security events yet.</p>
              )}
              {securityLog.slice(0, 8).map((event) => (
                <div
                  key={`${event.type}-${event.timestamp}`}
                  className="rounded-lg border border-amber-500/15 bg-black/60 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{event.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-amber-100/70">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded ${badgeStyles[event.severity]}`}>
                      {event.severity}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/70 mt-1">
                    {JSON.stringify(event.details).slice(0, 80)}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "testing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SectionCard title="XSS Protection" icon={<Shield className="h-6 w-6" />}>
            <div className="space-y-3">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Try: <script>alert('xss')</script>"
                className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-2 text-white placeholder:text-amber-100/50"
              />
              <button
                type="button"
                onClick={() => runSecurityTest("xss")}
                className="w-full rounded-xl bg-amber-500 text-black font-semibold py-2 hover:bg-amber-400 transition"
              >
                Test Sanitization
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Password Strength" icon={<KeyRound className="h-6 w-6" />}>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                  className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-2 text-white placeholder:text-amber-100/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-100/70"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => runSecurityTest("password")}
                className="w-full rounded-xl bg-amber-500 text-black font-semibold py-2 hover:bg-amber-400 transition"
              >
                Check Policy
              </button>
            </div>
          </SectionCard>

          <SectionCard title="SQL Injection" icon={<Lock className="h-6 w-6" />}>
            <div className="space-y-3">
              <input
                type="text"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Try: ' OR '1'='1"
                className="w-full rounded-xl border border-amber-500/25 bg-black/60 px-4 py-2 text-white placeholder:text-amber-100/50"
              />
              <button
                type="button"
                onClick={() => runSecurityTest("sql")}
                className="w-full rounded-xl bg-amber-500 text-black font-semibold py-2 hover:bg-amber-400 transition"
              >
                Scan Query
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Quick Actions" icon={<UploadCloud className="h-6 w-6" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { label: "Supabase Whitelist", action: () => runSecurityTest("supabase") },
                { label: "Rate Limiting", action: () => runSecurityTest("rateLimit") },
                { label: "CSRF Token", action: () => runSecurityTest("csrf") },
                { label: "Encryption", action: () => runSecurityTest("encryption") },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="rounded-lg border border-amber-500/20 bg-black/60 px-3 py-2 text-left hover:border-amber-400/40 hover:text-amber-50 transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Test Results"
            icon={
              <img
                src="/superior-security-shield.png"
                alt="Superior Security Software"
                className="h-6 w-6 object-contain"
                loading="lazy"
              />
            }
          >
            {testResults.length === 0 ? (
              <p className="text-sm text-amber-100/70">Run a test to see results.</p>
            ) : (
              <div className="space-y-3">
                {testResults.map((result) => (
                  <div
                    key={result.test + result.message}
                    className={`rounded-lg px-4 py-3 border ${
                      result.passed
                        ? "bg-emerald-900/20 border-emerald-500/40"
                        : "bg-red-900/20 border-red-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{result.test}</p>
                      {result.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-300" />
                      )}
                    </div>
                    <p className="text-sm text-amber-100/80 mt-1">{result.message}</p>
                    {result.detail && (
                      <p className="text-xs text-amber-100/60 mt-1 break-all">{result.detail}</p>
                    )}
                    {result.meta && (
                      <div className="text-[11px] text-amber-100/70 flex flex-wrap gap-2 mt-2">
                        {Object.entries(result.meta).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded bg-black/60 border border-amber-500/20 px-2 py-1"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === "logs" && (
        <SectionCard title="Security Event Log" icon={<Activity className="h-6 w-6" />}>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {securityLog.length === 0 && (
              <p className="text-sm text-amber-100/70 text-center py-8">No security events recorded yet.</p>
            )}
            {securityLog.map((event) => (
              <div
                key={`${event.type}-${event.timestamp}`}
                className="rounded-lg border border-amber-500/20 bg-black/60 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{event.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-amber-100/70">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded ${badgeStyles[event.severity]}`}>
                    {event.severity}
                  </span>
                </div>
                <pre className="text-xs text-amber-100/70 bg-black/50 rounded-lg mt-2 p-2 overflow-x-auto">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
