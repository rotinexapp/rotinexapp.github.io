// The "Entrar / Cadastrar" window of the landing page.
//
// It talks straight to Supabase Auth (only the public, publishable key, from
// assets/config.js, generated from the .env and never committed). Every
// password form carries a Cloudflare Turnstile token (anti-robot check).
// After signing in, the session is handed to the app in the address
// (app/#access_token=...), the same way Supabase's own e-mail links do.
(() => {
  const cfg = window.ROTINEX_CONFIG || {};
  const ready = Boolean(cfg.supabaseUrl && cfg.publishableKey);
  const english = document.documentElement.lang.startsWith("en");
  const root = new URL(english ? "../" : "./", location.href);
  const appUrl = new URL("app/", root).href;
  const backUrl = location.origin + location.pathname; // this page, no hash
  const CONSENTS = "rotinex.site_consents";
  const legal = (kind) => new URL((english ? "en/" : "") + kind + "/", root).href;
  const link = (kind, text) => `<a href="${legal(kind)}" target="_blank" rel="noopener">${text}</a>`;
  const TEST_SITE_KEY = "1x00000000000000000000AA"; // Cloudflare's "always passes" key

  const T = english
    ? {
        sign_in: "Sign in to Rotinex", message: "Check your e-mail", sign_up: "Create your account", forgot: "Forgot password",
        name: "What should we call you?", e_name: "Tell us how you'd like to be called.",
        email: "E-mail", password: "Password", password_new: "Password (at least 8 characters)",
        confirm: "Repeat the password", go_sign_in: "Sign in", go_sign_up: "Create account",
        send_link: "Send link", go_forgot: "Forgot password?", google: "Continue with Google", or: "or",
        terms: "I have read and accept the Terms of Use and the Privacy Policy",
        health: "I allow Rotinex to keep my health data (sleep, medicines, appointments, tests) so I can follow it in the app. I can withdraw this anytime.",
        draft: "The full Terms and Privacy Policy are under legal review and will be available before launch.",
        trial: "12 free days of the Complete plan, no card.",
        google_terms: "By continuing with Google you accept the Terms of Use and the Privacy Policy.",
        forgot_hint: "Enter your account's e-mail. If it's registered, you'll get a link to set a new password.",
        check_email: "We sent a confirmation link to your e-mail. Open it to start using Rotinex (check spam too).",
        recover_sent: "If that e-mail has an account, we sent a link to set a new password.",
        opened: "Already signed in on this device? Open the app",
        close: "Close", wait: "One moment…",
        e_fill: "Fill in the e-mail and the password.", e_email: "Enter a valid e-mail.",
        e_weak: "The password needs at least 8 characters.", e_mismatch: "The two passwords don't match.",
        e_terms: "To create the account, accept the Terms and the Privacy Policy.",
        e_robot: "Wait for the anti-robot check to finish (or tick it) and try again.",
        e_credentials: "Wrong e-mail or password.",
        e_not_confirmed: "Confirm your e-mail through the link we sent before signing in.",
        e_exists: "There's already an account with this e-mail. Try signing in or use \"Forgot password\".",
        e_too_many: "Too many attempts. Wait a few minutes and try again.",
        e_offline: "Can't reach the server. Check your internet and try again.",
        e_generic: "That didn't work. Try again in a moment.",
      }
    : {
        sign_in: "Entrar no Rotinex", message: "Confira seu e-mail", sign_up: "Criar sua conta", forgot: "Esqueci a senha",
        name: "Como prefere ser chamada(o)?", e_name: "Conte como prefere ser chamada(o).",
        email: "E-mail", password: "Senha", password_new: "Senha (mínimo 8 caracteres)",
        confirm: "Repita a senha", go_sign_in: "Entrar", go_sign_up: "Criar conta",
        send_link: "Enviar link", go_forgot: "Esqueci a senha", google: "Continuar com o Google", or: "ou",
        terms: "Li e aceito os Termos de Uso e a Política de Privacidade",
        health: "Autorizo o Rotinex a guardar meus dados de saúde (sono, remédios, consultas, exames) para eu acompanhar no app. Posso retirar quando quiser.",
        draft: "Os textos completos dos Termos e da Política estão em revisão jurídica e ficarão disponíveis antes do lançamento.",
        trial: "12 dias grátis do plano Completo, sem cartão.",
        google_terms: "Ao continuar com o Google, você aceita os Termos de Uso e a Política de Privacidade.",
        forgot_hint: "Informe o e-mail da sua conta. Se ele estiver cadastrado, você recebe um link para criar uma nova senha.",
        check_email: "Enviamos um link de confirmação para o seu e-mail. Abra o link para começar a usar o Rotinex (veja também o spam).",
        recover_sent: "Se esse e-mail tiver conta, enviamos um link para criar uma nova senha.",
        opened: "Já entrou neste aparelho? Abrir o app",
        close: "Fechar", wait: "Só um instante…",
        e_fill: "Preencha o e-mail e a senha.", e_email: "Informe um e-mail válido.",
        e_weak: "A senha precisa ter pelo menos 8 caracteres.", e_mismatch: "As duas senhas não são iguais.",
        e_terms: "Para criar a conta, aceite os Termos e a Política de Privacidade.",
        e_robot: "Espere a verificação anti-robô terminar (ou marque a caixa) e tente de novo.",
        e_credentials: "E-mail ou senha incorretos.",
        e_not_confirmed: "Confirme seu e-mail pelo link que enviamos antes de entrar.",
        e_exists: "Já existe uma conta com esse e-mail. Tente entrar ou use \"Esqueci a senha\".",
        e_too_many: "Muitas tentativas. Espere alguns minutos e tente de novo.",
        e_offline: "Sem conexão com o servidor. Confira a internet e tente de novo.",
        e_generic: "Não deu certo agora. Tente de novo em instantes.",
      };

  // The documents' names become links (they open in a new tab).
  for (const key of ["terms", "google_terms"]) {
    T[key] = T[key]
      .replace(english ? "Terms of Use" : "Termos de Uso", link("terms", english ? "Terms of Use" : "Termos de Uso"))
      .replace(english ? "Privacy Policy" : "Política de Privacidade", link("privacy", english ? "Privacy Policy" : "Política de Privacidade"));
  }
  T.draft = english
    ? "These texts are a draft under legal review before launch."
    : "Estes textos são um rascunho em revisão jurídica antes do lançamento.";

  // Back from Google or from the confirmation e-mail: hand the session to the app.
  const back = new URLSearchParams(location.hash.slice(1));
  if (ready && back.get("access_token") && back.get("refresh_token")) {
    handOff(back);
    return;
  }

  let mode = "sign_in";
  let robotToken = null;
  let widget = null;
  let busy = false;
  let googleOn = false; // shown only once Google is turned on in Supabase
  const dialog = document.createElement("dialog");
  dialog.className = "auth-dialog";
  dialog.setAttribute("aria-labelledby", "auth-title");
  document.body.append(dialog);

  function handOff(params) {
    const pass = new URLSearchParams();
    for (const key of ["access_token", "refresh_token", "expires_in"]) pass.set(key, params.get(key) || "");
    pass.set("type", "site");
    const consents = localStorage.getItem(CONSENTS);
    if (consents) pass.set("consents", consents);
    localStorage.removeItem(CONSENTS);
    location.replace(appUrl + "#" + pass.toString());
  }

  function errorText(status, body) {
    const text = ["error_code", "code", "msg", "error_description"].map((k) => String(body?.[k] ?? "")).join(" ").toLowerCase();
    if (text.includes("captcha")) return T.e_robot;
    if (text.includes("invalid") && (text.includes("credential") || text.includes("grant"))) return T.e_credentials;
    if (text.includes("not confirmed") || text.includes("email_not_confirmed")) return T.e_not_confirmed;
    if ((text.includes("already") && text.includes("registered")) || text.includes("user_already_exists")) return T.e_exists;
    if (text.includes("password") && /weak|short|least/.test(text)) return T.e_weak;
    if (status === 429 || text.includes("rate")) return T.e_too_many;
    return T.e_generic;
  }

  async function call(path, body) {
    let answer;
    try {
      answer = await fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}/auth/v1/${path}`, {
        method: "POST",
        headers: { apikey: cfg.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, gotrue_meta_security: { captcha_token: robotToken } }),
      });
    } catch {
      throw new Error(T.e_offline);
    } finally {
      resetRobot(); // a Turnstile token is good for one request only
    }
    const data = await answer.json().catch(() => ({}));
    if (!answer.ok) throw new Error(errorText(answer.status, data));
    return data;
  }

  // Cloudflare Turnstile ----------------------------------------------------------
  function loadRobot() {
    const box = dialog.querySelector(".auth-robot");
    if (!box) return;
    const render = () => {
      widget = window.turnstile.render(box, {
        sitekey: cfg.turnstileSiteKey || TEST_SITE_KEY,
        language: english ? "en" : "pt-br",
        // Measured with the window already open: "flexible" fills the width
        // (300 px or more); narrow phones get the small square one.
        size: box.clientWidth >= 300 ? "flexible" : "compact",
        callback: (token) => { robotToken = token; },
        "expired-callback": () => { robotToken = null; },
        "error-callback": () => { robotToken = null; },
      });
    };
    if (window.turnstile) return render();
    window.rotinexRobot = render;
    if (!document.querySelector("script[data-turnstile]")) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=rotinexRobot";
      script.async = true;
      script.dataset.turnstile = "";
      document.head.append(script);
    }
  }

  function resetRobot() {
    robotToken = null;
    if (widget !== null && window.turnstile) window.turnstile.reset(widget);
  }

  // The window --------------------------------------------------------------------
  const field = (name, label, type = "text", auto = "") =>
    `<label class="auth-field">${label}<input name="${name}" type="${type}" autocomplete="${auto}" required></label>`;
  const check = (name, label) => `<label class="auth-check"><input type="checkbox" name="${name}"><span>${label}</span></label>`;
  const google = `<button type="button" class="auth-google" data-action="google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>${T.google}</button><p class="auth-or"><span>${T.or}</span></p>`;

  function body() {
    if (mode === "sign_in") {
      return `${googleOn ? `${google}<p class="auth-note">${T.google_terms}</p>` : ""}${field("email", T.email, "email", "email")}${field("password", T.password, "password", "current-password")}
        <div class="auth-robot"></div><button class="button button-primary auth-submit" type="submit">${T.go_sign_in}</button>
        <p class="auth-links"><button type="button" data-mode="forgot">${T.go_forgot}</button><button type="button" data-mode="sign_up">${T.go_sign_up}</button></p>`;
    }
    if (mode === "sign_up") {
      return `${check("terms", T.terms)}${check("health", T.health)}<p class="auth-note">${T.draft}</p>${googleOn ? google : ""}
        ${field("name", T.name, "text", "given-name")}${field("email", T.email, "email", "email")}${field("password", T.password_new, "password", "new-password")}${field("confirm", T.confirm, "password", "new-password")}
        <div class="auth-robot"></div><button class="button button-primary auth-submit" type="submit">${T.go_sign_up}</button>
        <p class="auth-note">${T.trial}</p><p class="auth-links"><button type="button" data-mode="sign_in">${T.go_sign_in}</button></p>`;
    }
    if (mode === "forgot") {
      return `<p class="auth-note">${T.forgot_hint}</p>${field("email", T.email, "email", "email")}<div class="auth-robot"></div>
        <button class="button button-primary auth-submit" type="submit">${T.send_link}</button>
        <p class="auth-links"><button type="button" data-mode="sign_in">${T.go_sign_in}</button></p>`;
    }
    return `<p class="auth-links"><button type="button" data-mode="sign_in">${T.go_sign_in}</button></p>`; // message only
  }

  function draw(message = "", error = "") {
    if (widget !== null && window.turnstile) window.turnstile.remove(widget);
    widget = null;
    robotToken = null;
    dialog.innerHTML = `<form class="auth-card" novalidate>
      <button type="button" class="auth-close" data-action="close" aria-label="${T.close}">×</button>
      <img class="auth-logo" src="${new URL("assets/rotinex-logo.png", root).href}" alt="Rotinex">
      <h2 id="auth-title">${T[mode] || T.sign_in}</h2>
      ${message ? `<p class="auth-message" role="status">${message}</p>` : ""}
      ${body()}
      <p class="auth-error" role="alert">${error}</p>
      <a class="auth-open" href="${appUrl}">${T.opened}</a>
    </form>`;
    if (dialog.open) {
      loadRobot();
      dialog.querySelector("input")?.focus();
    }
  }

  function open(nextMode) {
    mode = nextMode;
    draw();
    if (!dialog.open) {
      dialog.showModal();
      loadRobot(); // only now the box has its real width
      dialog.querySelector("input")?.focus();
    }
  }

  const form = () => dialog.querySelector("form");
  const value = (name) => (form().elements[name]?.value || "").trim();
  const checked = (name) => Boolean(form().elements[name]?.checked);
  const fail = (text) => { form().querySelector(".auth-error").textContent = text; };
  const consentsChosen = () => ["terms", "privacy", ...(checked("health") ? ["health_data"] : [])].join(",");

  async function submit() {
    const email = value("email");
    const password = value("password");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(mode === "sign_in" && !email ? T.e_fill : T.e_email);
    if (mode === "sign_in" && !password) return fail(T.e_fill);
    if (mode === "sign_up") {
      if (!value("name")) return fail(T.e_name);
      if (password.length < 8) return fail(T.e_weak);
      if (password !== value("confirm")) return fail(T.e_mismatch);
      if (!checked("terms")) return fail(T.e_terms);
    }
    if (!robotToken) return fail(T.e_robot);
    if (mode === "sign_in") {
      const data = await call("token?grant_type=password", { email, password });
      return handOff(new URLSearchParams(data));
    }
    if (mode === "sign_up") {
      localStorage.setItem(CONSENTS, consentsChosen()); // kept until the e-mail link comes back
      // Also kept in the account, for an e-mail link opened on another device.
      const data = await call(`signup?redirect_to=${encodeURIComponent(backUrl)}`, {
        email, password, data: { consents: consentsChosen(), display_name: value("name").slice(0, 60) },
      });
      if (data.access_token) return handOff(new URLSearchParams(data));
      mode = "message";
      return draw(T.check_email);
    }
    await call(`recover?redirect_to=${encodeURIComponent(appUrl)}`, { email });
    mode = "message";
    draw(T.recover_sent);
  }

  function withGoogle() {
    if (mode === "sign_up") {
      if (!checked("terms")) return fail(T.e_terms);
      localStorage.setItem(CONSENTS, consentsChosen());
    } else {
      localStorage.setItem(CONSENTS, "terms,privacy"); // the note under the button
    }
    location.href = `${cfg.supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(backUrl)}`;
  }

  dialog.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const button = form().querySelector(".auth-submit");
    const label = button.textContent;
    button.disabled = true;
    button.textContent = T.wait;
    fail("");
    try {
      await submit();
    } catch (error) {
      fail(error.message || T.e_generic);
    } finally {
      busy = false;
      if (button.isConnected) { button.disabled = false; button.textContent = label; }
    }
  });

  dialog.addEventListener("close", () => {
    if (dialog.open) return; // reopened before this (late) event arrived
    if (widget !== null && window.turnstile) window.turnstile.remove(widget);
    widget = null;
    robotToken = null;
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) return dialog.close(); // a click outside the card
    const target = event.target.closest("[data-mode],[data-action]");
    if (!target) return;
    if (target.dataset.mode) return open(target.dataset.mode);
    if (target.dataset.action === "close") return dialog.close();
    if (target.dataset.action === "google") withGoogle();
  });

  // Error coming back from Google (e.g. the person cancelled).
  if (ready && back.get("error_description")) {
    history.replaceState(null, "", backUrl);
    open("sign_in");
    fail(T.e_generic);
  }

  if (ready) {
    fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: cfg.publishableKey } })
      .then((answer) => answer.json())
      .then((settings) => {
        googleOn = Boolean(settings?.external?.google);
        if (googleOn && dialog.open && !busy) draw();
      })
      .catch(() => {});
  }

  // Every "Entrar" / "Cadastrar" / "Começar" link opens the window.
  document.querySelectorAll("[data-auth], a[href$='app/']").forEach((link) => {
    if (link.closest(".auth-dialog")) return;
    if (!ready) {
      if (link.tagName === "BUTTON") link.addEventListener("click", () => { location.href = appUrl; });
      return;
    }
    link.addEventListener("click", (event) => {
      event.preventDefault();
      open(link.dataset.auth || "sign_up");
    });
  });
})();
