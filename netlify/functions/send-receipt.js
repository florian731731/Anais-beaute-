// Envoie un reçu de paiement au client (pas à Anaïs — ça c'est déjà géré par le
// formulaire Netlify "commande-payee"). Nécessite un domaine vérifié sur Resend,
// sinon Resend refuse d'envoyer à une adresse autre que celle du compte.

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée" }) };
  }

  const API_KEY = process.env.RESEND_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Configuration manquante : RESEND_API_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Corps de requête invalide" }) };
  }

  const { customerName, customerEmail, amount, mode, details } = payload;
  if (!customerEmail || !customerName || !Number.isFinite(Number(amount))) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Données manquantes" }) };
  }

  const amountStr = Number(amount).toFixed(2).replace(".", ",") + "€";
  const detailsHtml = String(details || "").replace(/\n/g, "<br>");
  const title = mode === "gift" ? "Votre bon cadeau" : "Votre paiement";

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #eee">
      <h1 style="color:#bd6675;font-size:22px;margin-bottom:4px">Anaïs Beauté</h1>
      <p style="color:#666;margin-top:0">Institut de beauté à Albertville</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <h2 style="font-size:18px">${title} — confirmation</h2>
      <p>Bonjour ${customerName},</p>
      <p>Merci pour votre paiement, voici votre confirmation :</p>
      <p style="font-size:24px;color:#bd6675;font-weight:bold">${amountStr}</p>
      <p style="white-space:pre-line">${detailsHtml}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="font-size:13px;color:#888">
        850 route de la Biolle, 73200 Pallud — 06 95 65 55 60<br>
        Un souci avec ce paiement ? Répondez simplement à cet email.
      </p>
    </div>
  `;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        from: "Anaïs Beauté <contact@anaisbeaute-albertville.fr>",
        to: [customerEmail],
        subject: `${title} — Anaïs Beauté (${amountStr})`,
        html,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data.message || "Erreur Resend" }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ id: data.id }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Impossible de contacter Resend" }) };
  }
};
