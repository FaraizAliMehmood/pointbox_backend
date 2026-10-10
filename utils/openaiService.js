const axios = require('axios');

const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const INVOICE_EXTRACTION_PROMPT = `You are an invoice data extraction engine. You will be given a photo of an invoice or bill. The invoice may be in any language, currency, layout, or design - do not rely on any fixed template.

Extract exactly these fields and respond with JSON matching the provided schema:

1. invoiceNumber: The invoice/bill/receipt reference number exactly as printed, preserving letters, hyphens, slashes and leading zeros. If you cannot reliably identify it, use null.

2. phoneNumbers: Every contact phone number printed on the invoice, as an array of strings exactly as printed (keep formatting such as "+" and spaces). If none are found, return an empty array. Never invent numbers.

3. amount: The final total payable amount for the invoice - NOT the subtotal, tax line, discount, or amount already paid. If the invoice shows a "Balance Due" instead of a "Total" / "Grand Total" / "Amount Payable", use the balance due value. If you cannot reliably identify a single final amount, use null.

4. currency: The currency of the amount (e.g. "USD", "PKR", "EUR"), identified from symbols or text on the invoice. Do not assume a default currency. If it cannot be determined, use null.

5. amountLabel: The exact label/field name printed on the invoice next to the amount you extracted (for example "Total", "Grand Total", "Balance Due", "Amount Payable"). Use null if unknown.

6. needsVerification: true if the amount is ambiguous, there are multiple candidate totals, the image is unclear, or you are not confident in the extracted amount. Otherwise false.

Rules:
- Never invent or assume missing information.
- Only return values you can actually read on the invoice.
- Respond with JSON only, matching the schema exactly.`;

const responseSchema = {
  name: 'invoice_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      invoiceNumber: { type: ['string', 'null'] },
      phoneNumbers: { type: 'array', items: { type: 'string' } },
      amount: { type: ['number', 'null'] },
      currency: { type: ['string', 'null'] },
      amountLabel: { type: ['string', 'null'] },
      needsVerification: { type: 'boolean' },
    },
    required: ['invoiceNumber', 'phoneNumbers', 'amount', 'currency', 'amountLabel', 'needsVerification'],
    additionalProperties: false,
  },
};

const normalizeResult = (raw) => {
  const invoiceNumber =
    typeof raw.invoiceNumber === 'string' && raw.invoiceNumber.trim() ? raw.invoiceNumber.trim() : null;

  const phoneNumbers = Array.isArray(raw.phoneNumbers)
    ? raw.phoneNumbers.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
    : [];

  const amount =
    typeof raw.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : null;

  const currency =
    typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency.trim().toUpperCase() : null;

  const amountLabel =
    typeof raw.amountLabel === 'string' && raw.amountLabel.trim() ? raw.amountLabel.trim() : null;

  const needsVerification = Boolean(raw.needsVerification) || amount === null;

  return { invoiceNumber, phoneNumbers, amount, currency, amountLabel, needsVerification };
};

/**
 * Sends an invoice image to OpenAI and returns the normalized extracted fields.
 */
async function extractInvoiceData(imageBuffer, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured on the server');
  }

  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const requestBody = {
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: INVOICE_EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: { type: 'json_schema', json_schema: responseSchema },
  };

  let response;
  try {
    response = await axios.post(OPENAI_API_BASE, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
    });
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message || 'OpenAI request failed';
    throw new Error(`OpenAI API error: ${message}`);
  }

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI did not return any content for this image');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('OpenAI returned an invalid response format');
  }

  return normalizeResult(parsed);
}

module.exports = { extractInvoiceData };
