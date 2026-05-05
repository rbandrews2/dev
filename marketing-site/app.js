(function () {
  const config = window.WZOS_CONFIG || {};
  const functionsBase = config.FUNCTIONS_BASE_URL;
  const publishableKey = config.SUPABASE_PUBLISHABLE_KEYS;

  function setMessage(target, text, type) {
    if (!target) return;
    target.textContent = text || "";
    target.classList.remove("success", "error");
    if (type) target.classList.add(type);
  }

  async function postFunction(name, payload) {
    const response = await fetch(`${functionsBase}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.message || data.error || "Request failed.");
    }

    return data;
  }

  async function recordPageView() {
    if (!functionsBase || !publishableKey) return;

    try {
      await postFunction("public-site-intake", {
        action: "page_view",
        source: "workzoneos_org",
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        screen: window.screen ? window.screen.width + "x" + window.screen.height : null,
        language: navigator.language || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        metadata: {
          title: document.title
        }
      });
    } catch (error) {
      console.warn("Page view intake failed:", error);
    }
  }

  function handleCookieBanner() {
    const banner = document.getElementById("cookie-banner");
    const dismiss = document.getElementById("cookie-dismiss");
    if (!banner || !dismiss) return;

    const seen = window.localStorage.getItem("wzos_cookie_notice_dismissed") === "1";
    if (!seen) {
      banner.hidden = false;
    }

    dismiss.addEventListener("click", function () {
      window.localStorage.setItem("wzos_cookie_notice_dismissed", "1");
      banner.hidden = true;
    });
  }

  function bindNewsletterForms() {
    const forms = document.querySelectorAll("[data-newsletter-form]");

    forms.forEach(function (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = form.querySelector("[data-form-message]");
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim().toLowerCase();

        if (!email) {
          setMessage(message, "Enter an email address.", "error");
          return;
        }

        setMessage(message, "Submitting...", null);

        try {
          await postFunction("public-site-intake", {
            action: "newsletter_signup",
            source: "workzoneos_org",
            placement: form.getAttribute("data-placement") || "unknown",
            name: String(formData.get("name") || "").trim(),
            email: email,
            company: String(formData.get("company") || "").trim(),
            consent: Boolean(formData.get("consent")),
            metadata: {
              page_path: window.location.pathname
            }
          });

          form.reset();
          const consent = form.querySelector('input[name="consent"]');
          if (consent) consent.checked = true;
          setMessage(message, "You have been added to the Work Zone OS newsletter.", "success");
        } catch (error) {
          setMessage(message, error.message || "Could not save your signup.", "error");
        }
      });
    });
  }

  function bindCheckoutForm() {
    const form = document.querySelector("[data-checkout-form]");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const message = form.querySelector("[data-checkout-message]");
      const formData = new FormData(form);

      setMessage(message, "Opening Stripe Checkout...", null);

      try {
        const payload = {
          email: String(formData.get("email") || "").trim().toLowerCase(),
          company: String(formData.get("company") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          product_sku: config.PRODUCT_SKU || "WZOS_CORE"
        };

        const response = await postFunction("create-checkout-session", payload);
        if (!response.checkout_url) {
          throw new Error("Stripe did not return a checkout URL.");
        }

        window.location.href = response.checkout_url;
      } catch (error) {
        setMessage(message, error.message || "Checkout could not be started.", "error");
      }
    });
  }

  async function handleSuccessPage() {
    if (document.body.dataset.page !== "success") return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const deliveryToken = params.get("delivery_token");
    const statusMessage = document.getElementById("purchase-status-message");
    const successLinks = document.getElementById("success-links");
    const activationCard = document.getElementById("activation-code-card");
    const activationValue = document.getElementById("activation-code-value");
    const copyActivationCode = document.getElementById("copy-activation-code");

    if (!sessionId || !deliveryToken) {
      if (statusMessage) {
        statusMessage.textContent = "Missing purchase confirmation details. Contact admin@workzoneos.org if your payment was completed.";
      }
      return;
    }

    let attempts = 0;
    while (attempts < 8) {
      attempts += 1;

      try {
        const result = await postFunction("purchase-status", {
          session_id: sessionId,
          delivery_token: deliveryToken
        });

        if (result.ready) {
          if (statusMessage) {
            statusMessage.textContent = "Payment confirmed. Copy this access code, then continue to app.superiorllc.org to create your organization.";
          }
          if (activationValue && result.activation_code) {
            activationValue.textContent = result.activation_code;
          }
          if (activationCard) {
            activationCard.hidden = false;
          }
          if (successLinks) {
            successLinks.hidden = false;
          }
          if (copyActivationCode && result.activation_code) {
            copyActivationCode.addEventListener("click", async function () {
              await navigator.clipboard.writeText(result.activation_code);
              copyActivationCode.textContent = "Copied";
              window.setTimeout(function () {
                copyActivationCode.textContent = "Copy code";
              }, 1400);
            }, { once: false });
          }
          return;
        }

        if (statusMessage) {
          statusMessage.textContent = "Payment received. Finalizing access now...";
        }
      } catch (error) {
        if (statusMessage) {
          statusMessage.textContent = error.message || "Could not confirm purchase yet.";
        }
      }

      await new Promise(function (resolve) {
        window.setTimeout(resolve, 2500);
      });
    }

    if (statusMessage) {
      statusMessage.textContent = "Your payment may still be processing. If access is not ready yet, use the app link shortly or email admin@workzoneos.org.";
    }
    if (successLinks) {
      successLinks.hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    handleCookieBanner();
    bindNewsletterForms();
    bindCheckoutForm();
    recordPageView();
    handleSuccessPage();
  });
})();
