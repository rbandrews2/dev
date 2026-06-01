import React, { FormEvent, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import "./styles.css";

type Config = {
  publishableKey: string;
  business: {
    name: string;
    address: string;
    supportEmail: string;
    supportPhone: string;
    currency: string;
  };
  policies: {
    privacyUrl: string;
    termsUrl: string;
    refundUrl: string;
  };
  fee: {
    label: string;
    amountCents: number;
  };
};

type AuthorizationForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: string;
  withdrawalDate: string;
  description: string;
  paymentFlow: "standard" | "ach";
  signatureAccepted: boolean;
};

const defaultForm: AuthorizationForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  amount: "250.00",
  withdrawalDate: nextBusinessDate(),
  description: "Professional consultation services",
  paymentFlow: "standard",
  signatureAccepted: false
};

function nextBusinessDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function centsFromDollars(value: string) {
  return Math.round(Number(value.replace(/[^0-9.]/g, "")) * 100);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function weekday(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    fetch("/api/checkout/config")
      .then((response) => response.json())
      .then((data: Config) => {
        setConfig(data);
        if (data.publishableKey) setStripePromise(loadStripe(data.publishableKey));
      })
      .catch(() => setError("Checkout configuration could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const subtotalCents = useMemo(() => centsFromDollars(form.amount || "0"), [form.amount]);
  const totalCents = subtotalCents + (config?.fee.amountCents || 0);
  const isThankYou = window.location.pathname === "/thank-you";

  async function submitCheckout(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let authorizationId = "";

      if (form.paymentFlow === "ach") {
        const authResponse = await fetch("/api/checkout/authorization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: form.customerName,
            customerEmail: form.customerEmail,
            customerPhone: form.customerPhone,
            amountCents: subtotalCents,
            withdrawalDate: form.withdrawalDate,
            description: form.description,
            signatureAccepted: form.signatureAccepted,
            authorizationVersion: "superior-ach-bank-auth-v2"
          })
        });

        const authData = await authResponse.json();
        if (!authResponse.ok) throw new Error(authData.error || "Authorization could not be saved.");
        authorizationId = authData.authorizationId;
      }

      const intentResponse = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentFlow: form.paymentFlow,
          authorizationId: authorizationId || undefined,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          amountCents: subtotalCents,
          withdrawalDate: form.withdrawalDate,
          description: form.description
        })
      });

      const intentData = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intentData.error || "Payment setup failed.");

      setClientSecret(intentData.clientSecret);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not continue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="loading-panel">
          <Loader2 className="spin" />
          Preparing secure checkout
        </div>
      </Shell>
    );
  }

  if (!config) {
    return (
      <Shell>
        <Notice tone="error" text={error || "Checkout is unavailable."} />
      </Shell>
    );
  }

  if (isThankYou) {
    return (
      <Shell>
        <ThankYou config={config} stripePromise={stripePromise} />
      </Shell>
    );
  }

  const paymentReady = clientSecret && stripePromise;

  return (
    <Shell>
      {stopped ? (
        <section className="single-panel">
          <AlertCircle />
          <h2>Checkout stopped</h2>
          <p>No authorization was granted and no payment was started.</p>
          <button className="secondary" onClick={() => setStopped(false)}>Return to checkout</button>
        </section>
      ) : (
        <main className="checkout-grid">
          <section className="panel">
            <BrandHeader config={config} />
            {!paymentReady ? (
              <AuthorizationStep
                config={config}
                form={form}
                setForm={setForm}
                subtotalCents={subtotalCents}
                totalCents={totalCents}
                submitting={submitting}
                error={error}
                onSubmit={submitCheckout}
                onStop={() => setStopped(true)}
              />
            ) : (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#0f766e",
                      borderRadius: "6px",
                      fontFamily: "Arial, Helvetica, sans-serif"
                    }
                  }
                }}
              >
                <PaymentStep customerEmail={form.customerEmail} paymentFlow={form.paymentFlow} />
              </Elements>
            )}
          </section>

          <Summary
            config={config}
            form={form}
            subtotalCents={subtotalCents}
            totalCents={totalCents}
          />
        </main>
      )}
    </Shell>
  );
}

function BrandHeader({ config }: { config: Config }) {
  return (
    <header className="checkout-header">
      <div>
        <p className="eyebrow">Secure payment authorization</p>
        <h1>{config.business.name}</h1>
        <p>{config.business.address}</p>
      </div>
      <div className="trust-stack" aria-label="Security assurances">
        <span><LockKeyhole size={16} /> TLS encrypted</span>
        <span><ShieldCheck size={16} /> Stripe-hosted payment fields</span>
        <span><BadgeCheck size={16} /> Explicit authorization required</span>
      </div>
    </header>
  );
}

function ThankYou({
  config,
  stripePromise
}: {
  config: Config;
  stripePromise: Promise<Stripe | null> | null;
}) {
  const [message, setMessage] = useState("Confirming payment status...");
  const [tone, setTone] = useState<"success" | "error">("success");

  useEffect(() => {
    const clientSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
    if (!clientSecret || !stripePromise) {
      setTone("error");
      setMessage("Payment status could not be confirmed from this page.");
      return;
    }

    stripePromise.then(async (stripeInstance) => {
      if (!stripeInstance) {
        setTone("error");
        setMessage("Secure payment status could not be loaded.");
        return;
      }

      const result = await stripeInstance.retrievePaymentIntent(clientSecret);
      const status = result.paymentIntent?.status;

      if (status === "succeeded") {
        setMessage("Thank you. Your payment was completed and a receipt will be emailed.");
        return;
      }

      if (status === "processing") {
        setMessage("Thank you. Your payment is processing. ACH payments may take several business days.");
        return;
      }

      if (status === "requires_payment_method") {
        setTone("error");
        setMessage("Payment was not completed. Please return to checkout and try another payment method.");
        return;
      }

      setMessage("Thank you. Your payment status is being finalized.");
    });
  }, [stripePromise]);

  return (
    <section className="single-panel">
      {tone === "success" ? <CheckCircle2 size={42} /> : <AlertCircle size={42} />}
      <h1>Payment received</h1>
      <Notice tone={tone} text={message} />
      <p>
        Questions? Contact {config.business.supportEmail} or {config.business.supportPhone}.
      </p>
      <a className="home-link" href="/">Start another checkout</a>
    </section>
  );
}

function AuthorizationStep(props: {
  config: Config;
  form: AuthorizationForm;
  setForm: React.Dispatch<React.SetStateAction<AuthorizationForm>>;
  subtotalCents: number;
  totalCents: number;
  submitting: boolean;
  error: string;
  onSubmit: (event: FormEvent) => void;
  onStop: () => void;
}) {
  const { config, form, setForm, subtotalCents, totalCents, submitting, error, onSubmit, onStop } = props;
  const update = (key: keyof AuthorizationForm, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const choosePaymentFlow = (paymentFlow: AuthorizationForm["paymentFlow"]) =>
    setForm((current) => ({
      ...current,
      paymentFlow,
      signatureAccepted: paymentFlow === "ach" ? current.signatureAccepted : false
    }));

  return (
    <form onSubmit={onSubmit} className="form-flow">
      <div>
        <p className="eyebrow">Step 1 of 2</p>
        <h2>Review payment details</h2>
        <p className="muted">
          You may continue to payment, or discontinue now. Payment fields are displayed after this
          step. Bank withdrawals require authorization before the ACH form opens.
        </p>
      </div>

      <div className="field-grid">
        <label>
          <span className="label-text"><UserRound size={16} /> Full legal name</span>
          <input
            required
            value={form.customerName}
            onChange={(event) => update("customerName", event.target.value)}
            autoComplete="name"
          />
        </label>
        <label>
          <span className="label-text"><Mail size={16} /> Email receipt</span>
          <input
            required
            type="email"
            value={form.customerEmail}
            onChange={(event) => update("customerEmail", event.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          <span className="label-text"><Phone size={16} /> Phone</span>
          <input
            value={form.customerPhone}
            onChange={(event) => update("customerPhone", event.target.value)}
            autoComplete="tel"
          />
        </label>
        <label>
          <span className="label-text"><DollarSign size={16} /> Amount</span>
          <input
            required
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => update("amount", event.target.value)}
          />
        </label>
        <label>
          <span className="label-text"><CalendarDays size={16} /> Withdrawal date</span>
          <input
            required
            type="date"
            value={form.withdrawalDate}
            onChange={(event) => update("withdrawalDate", event.target.value)}
          />
        </label>
        <label>
          <span className="label-text"><FileText size={16} /> Payment description</span>
          <input
            required
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </label>
      </div>

      <section className="payment-choice" aria-labelledby="payment-choice-heading">
        <h3 id="payment-choice-heading">Choose payment method</h3>
        <div className="payment-choice-grid">
          <label className={`choice-card ${form.paymentFlow === "standard" ? "selected" : ""}`}>
            <input
              type="radio"
              name="paymentFlow"
              checked={form.paymentFlow === "standard"}
              onChange={() => choosePaymentFlow("standard")}
            />
            <span>
              <strong>Card, wallet, or other Stripe method</strong>
              <small>Cards, Link, Apple Pay, Google Pay, Cash App Pay, PayPal, Amazon Pay, pay-later, and other eligible methods enabled in Stripe.</small>
            </span>
          </label>
          <label className={`choice-card ${form.paymentFlow === "ach" ? "selected" : ""}`}>
            <input
              type="radio"
              name="paymentFlow"
              checked={form.paymentFlow === "ach"}
              onChange={() => choosePaymentFlow("ach")}
            />
            <span>
              <strong>ACH bank withdrawal</strong>
              <small>Debit a United States bank account after you sign the authorization below.</small>
            </span>
          </label>
        </div>
      </section>

      {form.paymentFlow === "ach" ? (
      <div className="authorization-copy" role="dialog" aria-labelledby="ach-authorization-heading">
        <h3 id="ach-authorization-heading">ACH debit authorization</h3>
        <p>
          I authorize Superior Consultation, LLC to initiate an electronic ACH debit from the bank
          account I provide through Stripe in the amount of <strong>{money(totalCents)}</strong> on
          or after <strong>{weekday(form.withdrawalDate)}</strong> for{" "}
          {form.description || "the agreed transaction"}. This authorization includes the agreed
          transaction amount of {money(subtotalCents)}
          {config.fee.amountCents > 0 ? ` plus ${money(config.fee.amountCents)} for ${config.fee.label}` : ""}.
        </p>
        <p>
          I further authorize Superior Consultation, LLC to initiate ACH debits for any future
          amounts that I separately agree to pay for subscriptions, renewals, services, or related
          account obligations, and to initiate ACH credits to the same account for refunds,
          reversals, adjustments, or verification deposits and withdrawals used to confirm account
          ownership. I represent that I am an owner or authorized signer on the bank account and
          that this electronic authorization has the same legal effect as a written signature.
        </p>
        <label className="check-row">
          <input
            required
            type="checkbox"
            checked={form.signatureAccepted}
            onChange={(event) => update("signatureAccepted", event.target.checked)}
          />
          <span>
            I electronically sign this ACH debit authorization as{" "}
            {form.customerName || "the customer"} and agree to proceed.
          </span>
        </label>
      </div>
      ) : null}

      {error && <Notice tone="error" text={error} />}

      <div className="button-row">
        <button type="button" className="secondary" onClick={onStop}>
          Discontinue
        </button>
        <button
          type="submit"
          disabled={submitting || subtotalCents < 50 || (form.paymentFlow === "ach" && !form.signatureAccepted)}
        >
          {submitting ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
          {form.paymentFlow === "ach" ? "Continue and authorize" : "Continue to payment"}
        </button>
      </div>
    </form>
  );
}

function PaymentStep({
  customerEmail,
  paymentFlow
}: {
  customerEmail: string;
  paymentFlow: AuthorizationForm["paymentFlow"];
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setError("");
    setPaying(true);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: customerEmail,
        return_url: `${window.location.origin}/thank-you`
      }
    });

    if (result.error) {
      setError(result.error.message || "Payment could not be completed.");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={submitPayment} className="form-flow">
      <div>
        <p className="eyebrow">Step 2 of 2</p>
        <h2>{paymentFlow === "ach" ? "Connect bank account" : "Select payment method"}</h2>
        <p className="muted">
          {paymentFlow === "ach"
            ? "Stripe will collect and verify the bank account details needed for ACH processing."
            : "Stripe will show eligible card, wallet, pay-later, bank redirect, and other enabled methods based on device, account settings, location, and payment eligibility."}
        </p>
      </div>
      <PaymentElement />
      {error && <Notice tone="error" text={error} />}
      <button type="submit" disabled={!stripe || paying}>
        {paying ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
        Submit secure payment
      </button>
    </form>
  );
}

function Summary(props: {
  config: Config;
  form: AuthorizationForm;
  subtotalCents: number;
  totalCents: number;
}) {
  const { config, form, subtotalCents, totalCents } = props;
  return (
    <aside className="summary" aria-label="Payment summary">
      <h2>Payment summary</h2>
      <div className="line-item">
        <span>{form.description || "Services"}</span>
        <strong>{money(subtotalCents)}</strong>
      </div>
      <div className="line-item">
        <span>{config.fee.label}</span>
        <strong>{money(config.fee.amountCents)}</strong>
      </div>
      <div className="total line-item">
        <span>Total authorized</span>
        <strong>{money(totalCents)}</strong>
      </div>
      <div className="method-list">
        <PaymentMethodLogo brand="visa" label="Visa" />
        <PaymentMethodLogo brand="mastercard" label="Mastercard" />
        <PaymentMethodLogo brand="discover" label="Discover" />
        <PaymentMethodLogo brand="amex" label="American Express" />
        <PaymentMethodLogo brand="applepay" label="Apple Pay" />
        <PaymentMethodLogo brand="cashapp" label="Cash App Pay" />
        <PaymentMethodLogo brand="googlepay" label="Google Pay" />
        <PaymentMethodLogo brand="samsungpay" label="Samsung Wallet" />
        <PaymentMethodLogo brand="ach" label="ACH bank debit" />
        <PaymentMethodLogo brand="instantbank" label="Instant bank verification" />
        <PaymentMethodLogo brand="microdeposit" label="Micro-deposit verification" />
      </div>
      <div className="support-box">
        <Building2 size={18} />
        <p>
          Questions? Contact {config.business.supportEmail} or {config.business.supportPhone}.
        </p>
      </div>
      <nav className="legal-links">
        <a href={config.policies.privacyUrl}>Privacy</a>
        <a href={config.policies.termsUrl}>Terms</a>
        {config.policies.refundUrl ? <a href={config.policies.refundUrl}>Refund policy</a> : null}
      </nav>
    </aside>
  );
}

function PaymentMethodLogo({
  brand,
  label
}: {
  brand: string;
  label: string;
}) {
  return (
    <span className="method-pill">
      <span className={`brand-logo ${brand}`} aria-hidden="true">
        {renderBrandLogo(brand)}
      </span>
      <span className="method-label">{label}</span>
    </span>
  );
}

function renderBrandLogo(brand: string) {
  if (brand === "visa") return <img src="/payment-icons/visa.png" alt="" />;
  if (brand === "mastercard") return <img src="/payment-icons/mastercard.png" alt="" />;
  if (brand === "discover") return <img src="/payment-icons/discover.png" alt="" />;
  if (brand === "amex") return <span className="amex-word">AMEX</span>;
  if (brand === "applepay") return <img src="/payment-icons/apple-pay.png" alt="" />;
  if (brand === "cashapp") return <span className="cashapp-word">$ Pay</span>;
  if (brand === "googlepay") return <img src="/payment-icons/google-pay.png" alt="" />;
  if (brand === "samsungpay") return <span className="samsung-word">Pay SAMSUNG</span>;
  if (brand === "ach") return <span className="bank-word"><Landmark size={16} /> ACH</span>;
  if (brand === "instantbank") return <span className="bank-word"><Landmark size={16} /> BANK</span>;
  return <span className="bank-word"><Landmark size={16} /> VERIFY</span>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">{children}</div>;
}

function Notice({ tone, text }: { tone: "error" | "success"; text: string }) {
  return <div className={`notice ${tone}`}>{text}</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
