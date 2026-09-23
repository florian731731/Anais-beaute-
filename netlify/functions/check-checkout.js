// Vérifie le statut réel d'un paiement auprès de SumUp.
// Utilisé après un retour de redirection (3D Secure, Apple Pay, Google Pay)
// pour confirmer qu'un paiement a bien abouti avant d'envoyer la notification.

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const API_KEY = process.env.SUMUP_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Configuration manquante" }) };
  }

  const checkoutId = event.queryStringParameters && event.queryStringParameters.id;
  if (!checkoutId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Identifiant de paiement manquant" }) };
  }

  try {
    const resp = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: data.message || "Erreur SumUp" }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ status: data.status }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Impossible de contacter SumUp" }) };
  }
};
