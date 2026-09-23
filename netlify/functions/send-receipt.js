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

  const amountStr = Number(amount).toFixed(2).replace(".", ",") + " €";
  const detailsHtml = String(details || "").replace(/\n/g, "<br>");
  const title = mode === "gift" ? "Votre bon cadeau" : "Confirmation de paiement";
  const introLine = mode === "gift"
    ? "Merci pour votre achat ! Voici la confirmation de votre bon cadeau."
    : "Merci pour votre paiement ! Voici votre confirmation.";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F8F1EA;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F1EA;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background-color:#FFFDFB;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(40,28,20,.08);">

<tr><td style="background-color:#6B2A3B;padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:1px;color:#FFFDFB;font-weight:normal;">Anaïs Beauté</div>
<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#E7D2D1;text-transform:uppercase;margin-top:4px;">Institut de beauté à Albertville</div>
</td></tr>

<tr><td style="padding:36px 32px 8px;">
<div style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#AD8A54;font-weight:bold;">${title}</div>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:#211D1B;margin:8px 0 20px;font-weight:normal;">Bonjour ${customerName},</h1>
<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#716A62;margin:0 0 24px;">${introLine}</p>
</td></tr>

<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" style="background-color:#F5ECE4;border-radius:10px;">
<tr><td style="padding:24px;">
<div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#716A62;margin-bottom:6px;">Montant réglé</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;color:#B15E6C;font-weight:bold;margin-bottom:16px;">${amountStr}</div>
<div style="height:1px;background-color:#E8DFD6;margin:16px 0;"></div>
<div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#716A62;margin-bottom:8px;">Détail</div>
<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#211D1B;">${detailsHtml}</div>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:28px 32px 8px;">
<p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#716A62;margin:0;">
À très bientôt à l'institut ! Un souci avec ce paiement ? Répondez simplement à cet email.
</p>
</td></tr>

<tr><td style="padding:24px 32px 32px;">
<div style="height:1px;background-color:#E8DFD6;margin-bottom:20px;"></div>
<p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#AD8A54;margin:0;text-align:center;">
850 route de la Biolle, 73200 Pallud<br>
06 95 65 55 60
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

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
        reply_to: "anaiscattellin@gmail.com",
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
