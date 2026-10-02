# Card Management API Integration Guide

This guide is the frontend contract for the credit/debit card management APIs implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/cards`

---

## Integration rules

- Every route in this guide requires an authenticated **Student** session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`). Non-students receive `403 You do not have permission to perform this action`.
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as all other APIs.
- Strict validation is used: do not send undocumented parameters. Undocumented params cause `400 Validation failed`.
- Requests under `/api` are rate-limited per IP.
- Raw credit card details (card number, CVC, expiry date) **never** pass through our backend server. Adding a card uses a Stripe `SetupIntent` with Stripe Elements on the frontend.
- When a student's card is added and they had no previous cards, it is automatically marked as their default payment method.
- When a default card is deleted, the backend automatically promotes the first remaining card (if any) as the new default.

---

## Roles and access

| Route | Allowed caller | Visibility |
| :--- | :--- | :--- |
| `GET /` | Student only | List the calling student's saved cards. |
| `POST /setup-intent` | Student only | Creates a Stripe SetupIntent for securely saving a card via Stripe Elements. |
| `PATCH /:id/default` | Student only | Sets the specified card as the student's default payment method. |
| `DELETE /:id` | Student only | Removes/detaches the specified card from the student's account. |

A caller who is not authenticated receives `401`. A caller with a role other than `student` (e.g. `instructor`, `admin`) receives `403`.

---

## Saved Card Shape

Each card object returned by `GET /api/v1/cards`:

```json
{
  "id": "pm_1PqABC2eZvKYlo2CXXXXXX",
  "brand": "visa",
  "last4": "4242",
  "expMonth": 8,
  "expYear": 2028,
  "isDefault": true,
  "cardholderName": "Alex Morgan",
  "funding": "credit",
  "country": "US",
  "createdAt": "2026-03-15T12:00:00.000Z"
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The Stripe PaymentMethod ID (starts with `pm_`). Use this ID for default and delete endpoints. |
| `brand` | `string` | Brand identifier (`"visa"`, `"mastercard"`, `"amex"`, `"discover"`, `"jcb"`, etc.). |
| `last4` | `string` | Last 4 digits of the card number. |
| `expMonth` | `number` | Expiration month (1–12). |
| `expYear` | `number` | Four-digit expiration year (e.g. 2028). |
| `isDefault` | `boolean` | `true` if this card is currently the primary default card. |
| `cardholderName` | `string \| null` | Name on the card collected during setup. |
| `funding` | `string \| null` | Card funding type (`"credit"`, `"debit"`, `"prepaid"`, or `null`). |
| `country` | `string \| null` | Two-letter country code of the issuing bank. |
| `createdAt` | `string` | ISO 8601 timestamp when the card was attached. |

---

## API 1 — List saved cards

`GET /api/v1/cards`

Returns all cards saved by the authenticated student. If the student has never saved a card or completed a checkout, an empty list `[]` is returned.

### Request

No request body or query params.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Payment cards fetched successfully",
  "data": {
    "cards": [
      {
        "id": "pm_1PqABC2eZvKYlo2CXXXXXX",
        "brand": "visa",
        "last4": "4242",
        "expMonth": 8,
        "expYear": 2028,
        "isDefault": true,
        "cardholderName": "Alex Morgan",
        "funding": "credit",
        "country": "US",
        "createdAt": "2026-03-15T12:00:00.000Z"
      }
    ]
  }
}
```

### Possible errors

| HTTP status | Message | When |
| :--- | :--- | :--- |
| `401` | Unauthorized | Missing or expired auth token. |
| `403` | `You do not have permission to perform this action` | Caller is not a student. |

---

## API 2 — Create Card SetupIntent

`POST /api/v1/cards/setup-intent`

Generates a Stripe `SetupIntent` and returns a `clientSecret`. The frontend passes this `clientSecret` to Stripe.js to securely collect and tokenize the card without raw card data touching your server.

### Request

No request body.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Card setup intent created successfully",
  "data": {
    "clientSecret": "seti_1PqXYZ2eZvKYlo2C_secret_XXXXXX"
  }
}
```

### Frontend usage with Stripe Elements

```typescript
// 1. Call the backend to get clientSecret
const { data } = await api.post("/api/v1/cards/setup-intent");
const clientSecret = data.data.clientSecret;

// 2. Confirm the card setup on Stripe directly
const result = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: elements.getElement(CardElement),
    billing_details: {
      name: cardholderName,
    },
  },
});

if (result.error) {
  // Show error to student (e.g. invalid card number)
  console.error(result.error.message);
} else {
  // Card saved! Re-fetch cards via GET /api/v1/cards
  // If user selected "Set as default", call PATCH /api/v1/cards/:id/default with result.setupIntent.payment_method
}
```

---

## API 3 — Set default card

`PATCH /api/v1/cards/:id/default`

Sets the specified card as the student's primary/default payment method.

### URL params

| Param | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The Stripe payment method ID (e.g. `pm_1PqABC...`). |

### Request

No request body.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Default payment card updated successfully",
  "data": null
}
```

### Possible errors

| HTTP status | Message | When |
| :--- | :--- | :--- |
| `400` | `Card id is required` | Param missing or empty. |
| `403` | `You do not have permission to modify this card` | The payment method does not belong to the calling student. |
| `404` | `Payment card not found` | The card ID does not exist in Stripe. |

---

## API 4 — Delete saved card

`DELETE /api/v1/cards/:id`

Removes/detaches the card from the student's Stripe customer account. If this card was the student's default and other cards remain, the first remaining card is automatically promoted to default.

### URL params

| Param | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The Stripe payment method ID (e.g. `pm_1PqABC...`). |

### Request

No request body.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Payment card removed successfully",
  "data": null
}
```

### Possible errors

| HTTP status | Message | When |
| :--- | :--- | :--- |
| `400` | `Card id is required` | Param missing or empty. |
| `403` | `You do not have permission to delete this card` | The payment method does not belong to the calling student. |
| `404` | `Payment card not found` | The card ID does not exist in Stripe. |

---

## Frontend Types

Copy [`src/response-types/cardResponseTypes.ts`](../src/response-types/cardResponseTypes.ts) directly into your frontend project. It exports:
- `SavedCard`
- `GetSavedCardsResponseData`
- `GetSavedCardsResponse`
- `CreateCardSetupIntentResponseData`
- `CreateCardSetupIntentResponse`
- `SetDefaultCardResponse`
- `DeleteSavedCardResponse`
