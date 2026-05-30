import { Link } from "react-router-dom";

export default function PurchaseCancelled() {
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-orange-500/20 bg-black/40 p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-orange-200/70">Checkout cancelled</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Your purchase was not completed.</h1>
      <p className="mt-4 text-sm text-orange-100/75">
        You can return to the secure checkout whenever you are ready. No activation code is issued until Stripe confirms payment.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-black hover:bg-orange-400">
          Return home
        </Link>
        <Link to="/contact" className="rounded-xl border border-orange-400/30 px-4 py-3 text-orange-100 hover:bg-white/5">
          Contact support
        </Link>
      </div>
    </div>
  );
}
