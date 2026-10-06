# Course Lifecycle — DB State at Every Step

This document covers the complete lifecycle of a course from creation to a student
successfully enrolling via Stripe payment. At each step the exact DB state is shown.

---

## Assumptions

| Variable | Value |
|---|---|
| `PLATFORM_COMMISSION_PERCENTAGE` | `5` — always fixed at 5% |
| Course price | `$100` |
| Student ID | `64c0a1b2c3d4e5f6a7b8c9d1` |
| Instructor ID | `64e0b1a2c3d4e5f6a7b8c9d0` |
| Category ID | `64d9f0a1b2c3d4e5f6a7b8c9` |
| Course ID | `64f1a2b3c4d5e6f7a8b9c0d1` |


---

## Step 1 — Instructor Creates a Course

**API:** `POST /api/courses`
**Role:** Instructor
**Middlewares:** `protect` → `restrictTo(Instructor)` → `requireStripeOnboarding` → `validation`

### What happens:
- Course document is created in DB
- `isVerified` defaults to `false` — course is NOT visible to students yet
- All stats default to `0`

### Course in DB after creation:

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "title": "Complete Node.js & TypeScript Backend Development",
  "description": "Master backend development with Node.js, Express, TypeScript, MongoDB, and Stripe payments. Build production-ready REST APIs from scratch with authentication, file uploads, and payment processing.",
  "thumbnailKey": "thumbnails/course-thumb-001.jpg",
  "videoKey": "videos/course-video-001.mp4",
  "price": 100,
  "level": "intermediate",
  "instructor": "64e0b1a2c3d4e5f6a7b8c9d0",
  "category": "64d9f0a1b2c3d4e5f6a7b8c9",
  "isVerified": false,
  "verificationRejectionReason": null,
  "lastVerificationRejectedAt": null,
  "averageRating": 0,
  "totalReviews": 0,
  "totalStudentsEnrolled": 0,
  "totalDurationInMinutes": 0,
  "totalRevenueInstructor": 0,
  "totalRevenueAdmin": 0,
  "slug": "complete-nodejs-typescript-backend-development",
  "createdAt": "2024-09-01T08:00:00.000Z",
  "updatedAt": "2024-09-01T08:00:00.000Z"
}
```

### DB Changes:
| Collection | Action | Fields Changed |
|---|---|---|
| `courses` | INSERT | All fields created with defaults |

---

## Step 2 — Admin Verifies the Course

**API:** `PATCH /api/courses/:id/verification`
**Role:** Admin
**Body:** `{ "isVerified": true }`

### What happens:
- `isVerified` flips to `true`
- Course becomes purchasable by students
- `updatedAt` is updated

### Course in DB after verification:

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "title": "Complete Node.js & TypeScript Backend Development",
  "description": "Master backend development with Node.js, Express, TypeScript, MongoDB, and Stripe payments. Build production-ready REST APIs from scratch with authentication, file uploads, and payment processing.",
  "thumbnailKey": "thumbnails/course-thumb-001.jpg",
  "videoKey": "videos/course-video-001.mp4",
  "price": 100,
  "level": "intermediate",
  "instructor": "64e0b1a2c3d4e5f6a7b8c9d0",
  "category": "64d9f0a1b2c3d4e5f6a7b8c9",
  "isVerified": true,
  "verificationRejectionReason": null,
  "lastVerificationRejectedAt": null,
  "averageRating": 0,
  "totalReviews": 0,
  "totalStudentsEnrolled": 0,
  "totalDurationInMinutes": 0,
  "totalRevenueInstructor": 0,
  "totalRevenueAdmin": 0,
  "slug": "complete-nodejs-typescript-backend-development",
  "createdAt": "2024-09-01T08:00:00.000Z",
  "updatedAt": "2024-09-02T10:00:00.000Z"
}
```

### DB Changes:
| Collection | Action | Fields Changed |
|---|---|---|
| `courses` | UPDATE | `isVerified: false → true`, `updatedAt` |

---

## Step 3 — Student Hits Payment Intent API

**API:** `POST /api/courses/:id/payment-intent`
**Role:** Student
**Middlewares:** `protect` → `restrictTo(Student)` → `validation(courseIdParamsSchema)`

### What happens internally (`createCoursePaymentIntentService`):
1. Course fetched — must exist and `isVerified: true`
2. Enrollment checked — student must NOT already be enrolled
3. Pending transaction check — if one exists and price is unchanged, existing `clientSecret` is returned (no duplicate transaction). If price changed, old one is cancelled and marked `failed`
4. Student's Stripe Customer created lazily if they don't have `stripeCustomerId`
5. Instructor's Stripe onboarding verified
6. `amountInCents = 100 * 100 = 10000`
7. `adminCommission = (10000 * 5) / 100 = 500 cents = $5`
8. Stripe `PaymentIntent` created with `application_fee_amount: 500` and `transfer_data.destination: instructor.stripeAccountId`
9. **Pending Transaction** created in DB

### Response to frontend:
```json
{
  "status": "success",
  "message": "Payment intent created successfully",
  "data": {
    "clientSecret": "pi_3Pxyz_stripe_paymentintent_id_secret_xyz"
  }
}
```

### Transaction in DB after payment-intent (PENDING):

```json
{
  "_id": "65a2b3c4d5e6f7a8b9c0d1e2",
  "transactionId": "pi_3Pxyz_stripe_paymentintent_id",
  "stripeChargeId": null,
  "currency": "usd",
  "student": "64c0a1b2c3d4e5f6a7b8c9d1",
  "course": "64f1a2b3c4d5e6f7a8b9c0d1",
  "instructor": "64e0b1a2c3d4e5f6a7b8c9d0",
  "totalPrice": 100,
  "amountPaid": 0,
  "amountPaidAt": null,
  "paymentStatus": "pending",
  "adminCommissionPercentage": 5,
  "adminCommission": 5,
  "instructorRevenue": 95,
  "createdAt": "2024-09-03T11:55:00.000Z",
  "updatedAt": "2024-09-03T11:55:00.000Z"
}
```

### DB Changes:
| Collection | Action | Fields Changed |
|---|---|---|
| `courses` | No change | — |
| `transactions` | INSERT | New pending transaction created |
| `users` (student) | UPDATE (conditional) | `stripeCustomerId` set if it was null |

---

## Step 4 — Frontend Confirms Payment via Stripe.js

Frontend uses the `clientSecret` with `stripe.confirmPayment()`.
Stripe processes the card charge on its side.

**No backend API call happens at this point.**
The backend is idle — waiting for Stripe's webhook.

---

## Step 5 — Stripe Sends `payment_intent.succeeded` Webhook

**Route:** `POST /api/stripe/webhook`
**Handler:** `handlePaymentIntentSucceededService`

### What happens internally:
1. Metadata extracted from PaymentIntent: `{ courseId, studentId, instructorId }`
2. Amounts calculated:
   - `totalPrice = 10000 / 100 = $100`
   - `adminCommission = 500 / 100 = $5`
   - `instructorRevenue = $100 - $5 = $95`
3. Pending Transaction fetched by `paymentIntent.id`
4. Duplicate check — if Enrollment already exists, webhook is skipped (idempotency)
5. `stripeChargeId` resolved from `paymentIntent.latest_charge`
6. Transaction updated: `pending → paid`
7. Enrollment created — student now has course access
8. Course stats updated: `totalStudentsEnrolled +1`, revenue split added

---

### Course in DB after webhook:

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "title": "Complete Node.js & TypeScript Backend Development",
  "description": "Master backend development with Node.js, Express, TypeScript, MongoDB, and Stripe payments. Build production-ready REST APIs from scratch with authentication, file uploads, and payment processing.",
  "thumbnailKey": "thumbnails/course-thumb-001.jpg",
  "videoKey": "videos/course-video-001.mp4",
  "price": 100,
  "level": "intermediate",
  "instructor": "64e0b1a2c3d4e5f6a7b8c9d0",
  "category": "64d9f0a1b2c3d4e5f6a7b8c9",
  "isVerified": true,
  "verificationRejectionReason": null,
  "lastVerificationRejectedAt": null,
  "averageRating": 0,
  "totalReviews": 0,
  "totalStudentsEnrolled": 1,
  "totalDurationInMinutes": 0,
  "totalRevenueInstructor": 95,
  "totalRevenueAdmin": 5,
  "slug": "complete-nodejs-typescript-backend-development",
  "createdAt": "2024-09-01T08:00:00.000Z",
  "updatedAt": "2024-09-03T12:00:00.000Z"
}
```

### Transaction in DB after webhook (PAID):

```json
{
  "_id": "65a2b3c4d5e6f7a8b9c0d1e2",
  "transactionId": "pi_3Pxyz_stripe_paymentintent_id",
  "stripeChargeId": "ch_3Pxyz_stripe_charge_id",
  "currency": "usd",
  "student": "64c0a1b2c3d4e5f6a7b8c9d1",
  "course": "64f1a2b3c4d5e6f7a8b9c0d1",
  "instructor": "64e0b1a2c3d4e5f6a7b8c9d0",
  "totalPrice": 100,
  "amountPaid": 100,
  "amountPaidAt": "2024-09-03T12:00:00.000Z",
  "paymentStatus": "paid",
  "adminCommissionPercentage": 5,
  "adminCommission": 5,
  "instructorRevenue": 95,
  "createdAt": "2024-09-03T11:55:00.000Z",
  "updatedAt": "2024-09-03T12:00:00.000Z"
}
```

### Enrollment in DB after webhook (NEW):

```json
{
  "_id": "65b3c4d5e6f7a8b9c0d1e2f3",
  "student": "64c0a1b2c3d4e5f6a7b8c9d1",
  "course": "64f1a2b3c4d5e6f7a8b9c0d1",
  "instructor": "64e0b1a2c3d4e5f6a7b8c9d0",
  "transaction": "65a2b3c4d5e6f7a8b9c0d1e2",
  "enrolledAt": "2024-09-03T12:00:00.000Z",
  "totalDurationWatchedInMinutes": 0,
  "watchPercentage": 0,
  "watchedCompletely": false,
  "watchedCompletelyAt": null,
  "mostRecentlySeen": false,
  "certificateIssued": false,
  "certificateIssuedAt": null,
  "createdAt": "2024-09-03T12:00:00.000Z",
  "updatedAt": "2024-09-03T12:00:00.000Z"
}
```

### DB Changes (webhook):
| Collection | Action | Fields Changed |
|---|---|---|
| `transactions` | UPDATE | `paymentStatus: pending → paid`, `amountPaid`, `amountPaidAt`, `stripeChargeId`, `updatedAt` |
| `enrollments` | INSERT | New enrollment record, all progress defaults at `0/false` |
| `courses` | UPDATE | `totalStudentsEnrolled +1`, `totalRevenueInstructor +95`, `totalRevenueAdmin +5`, `updatedAt` |

---

## Full Flow Summary

```
Instructor                 Admin                  Student              Stripe
    |                        |                       |                    |
    |-- POST /courses ------->|                       |                    |
    |   Course created        |                       |                    |
    |   isVerified: false     |                       |                    |
    |                        |                       |                    |
    |         PATCH /courses/:id/verification ------->|                    |
    |                        |  isVerified: true      |                    |
    |                        |                       |                    |
    |                               POST /courses/:id/payment-intent ----->|
    |                               Pending Transaction created            |
    |                               clientSecret returned <---------------|
    |                                                 |                    |
    |                                        confirmPayment() ------------>|
    |                                                 |   Card charged     |
    |                                                 |                    |
    |                               webhook: payment_intent.succeeded <----|
    |                               Transaction: pending → paid            |
    |                               Enrollment: created                    |
    |                               Course stats: updated                  |
```

---

## Key Design Notes

| Concern | Solution |
|---|---|
| Frontend double-call to `/payment-intent` | Existing pending intent is reused if price is unchanged — no duplicate transactions |
| Stripe webhook delivered twice | Enrollment existence checked first — duplicate webhook safely skipped (idempotency) |
| Student charged twice | Only one active PaymentIntent per student+course allowed at a time |
| Course access granted securely | Access granted via webhook only — cannot be faked by frontend |
