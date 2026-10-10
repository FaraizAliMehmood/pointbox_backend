const axios = require('axios');

const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const INVOICE_EXTRACTION_PROMPT = `You are an invoice data extraction engine. You will be given a photo of an invoice or bill. The invoice may be in any language, currency, layout, or design - do not rely on any fixed template.

Extract exactly these fields and respond with JSON matching the provided schema:

1. invoiceNumber: The invoice/bill/receipt reference number exactly as printed, preserving letters, hyphens, slashes and leading zeros. If you cannot reliably identify it, use null.

2. phoneNumbers: Every contact phone number printed anywhere on the invoice (including the issuing business's own letterhead/header/footer contact numbers), as an array of strings exactly as printed (keep formatting such as "+" and spaces). If none are found, return an empty array. Never invent numbers.

3. customerPhoneNumber: The phone number that belongs specifically to the CUSTOMER / BUYER the invoice was issued to - for example a number printed next to a "Bill To", "Sold To", "Customer", "Ship To", "Client" section, or directly beside the customer's name/address. This is NEVER the phone number of the business/store/vendor that issued the invoice (do not use numbers found in the letterhead, logo area, header, or footer - those belong to the seller, not the customer). If the invoice does not clearly label a customer-specific phone number, or you cannot confidently tell it apart from the seller's own contact numbers, use null rather than guessing.

4. amount: The final total payable amount for the invoice - NOT the subtotal, tax line, discount, or amount already paid. If the invoice shows a "Balance Due" instead of a "Total" / "Grand Total" / "Amount Payable", use the balance due value. If you cannot reliably identify a single final amount, use null.

5. currency: The currency of the amount (e.g. "USD", "PKR", "EUR"), identified from symbols or text on the invoice. Do not assume a default currency. If it cannot be determined, use null.

6. amountLabel: The exact label/field name printed on the invoice next to the amount you extracted (for example "Total", "Grand Total", "Balance Due", "Amount Payable"). Use null if unknown.

7. needsVerification: true if the amount is ambiguous, there are multiple candidate totals, the image is unclear, or you are not confident in the extracted amount. Otherwise false.

Rules:
- Never invent or assume missing information.
- Only return values you can actually read on the invoice.
- Do not confuse the seller's/business's own contact number with the customer's phone number - they are frequently both printed on the same invoice and must not be mixed up.
- Respond with JSON only, matching the schema exactly.`;

const responseSchema = {
  name: 'invoice_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      invoiceNumber: { type: ['string', 'null'] },
      phoneNumbers: { type: 'array', items: { type: 'string' } },
      customerPhoneNumber: { type: ['string', 'null'] },
      amount: { type: ['number', 'null'] },
      currency: { type: ['string', 'null'] },
      amountLabel: { type: ['string', 'null'] },
      needsVerification: { type: 'boolean' },
    },
    required: ['invoiceNumber', 'phoneNumbers', 'customerPhoneNumber', 'amount', 'currency', 'amountLabel', 'needsVerification'],
    additionalProperties: false,
  },
};

const normalizeResult = (raw) => {
  const invoiceNumber =
    typeof raw.invoiceNumber === 'string' && raw.invoiceNumber.trim() ? raw.invoiceNumber.trim() : null;

  const phoneNumbers = Array.isArray(raw.phoneNumbers)
    ? raw.phoneNumbers.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
    : [];

  const customerPhoneNumber =
    typeof raw.customerPhoneNumber === 'string' && raw.customerPhoneNumber.trim()
      ? raw.customerPhoneNumber.trim()
      : null;

  const amount =
    typeof raw.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : null;

  const currency =
    typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency.trim().toUpperCase() : null;

  const amountLabel =
    typeof raw.amountLabel === 'string' && raw.amountLabel.trim() ? raw.amountLabel.trim() : null;

  const needsVerification = Boolean(raw.needsVerification) || amount === null;

  return { invoiceNumber, phoneNumbers, customerPhoneNumber, amount, currency, amountLabel, needsVerification };
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
