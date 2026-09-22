// Fonction serveur Netlify — crée un "checkout" SumUp de façon sécurisée.
// La clé secrète SUMUP_API_KEY n'est JAMAIS envoyée au navigateur : elle reste
// uniquement ici, côté serveur, lue depuis les variables d'environnement Netlify.

const MIN_AMOUNT = 5;      // montant minimum autorisé, en euros
const MAX_AMOUNT = 1000;   // montant maximum autorisé, en euros (sécurité anti-erreur/abus)

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Méthode non autorisée" }) };
  }

  const API_KEY = process.env.SUMUP_API_KEY;
  const MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;

  if (!API_KEY || !MERCHANT_CODE) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Configuration manquante : SUMUP_API_KEY et/ou SUMUP_MERCHANT_CODE ne sont pas définis dans les variables d'environnement Netlify.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Corps de requête invalide" }) };
  }

  const amount = Number(payload.amount);
  const description = String(payload.description || "Paiement Anaïs Beauté").slice(0, 90);

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Montant invalide (doit être entre ${MIN_AMOUNT}€ et ${MAX_AMOUNT}€)` }),
    };
  }

  // Référence unique pour ce paiement (utile pour retrouver la transaction côté SumUp)
  const checkoutReference = `AB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const resp = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        checkout_reference: checkoutReference,
        amount: Math.round(amount * 100) / 100,
        currency: "EUR",
        merchant_code: MERCHANT_CODE,
        description,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: data.message || data.error_message || "Erreur SumUp lors de la création du paiement" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ checkoutId: data.id, reference: checkoutReference }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Impossible de contacter SumUp pour le moment. Réessayez dans un instant." }),
    };
  }
};
