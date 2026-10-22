# DailyRokar Backend

DailyRokar is a shop-ledger application for recording sales, expenses, and AEPS transactions. This directory contains the Node.js/Express API and MongoDB persistence layer used by the DailyRokar frontend.

The API provides account registration and email verification, authentication, profile management, date-filtered transaction history, and cash/online ledger balances.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Requirements](#requirements)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [Run the server](#run-the-server)
- [API overview](#api-overview)
- [Authentication](#authentication)
- [API reference](#api-reference)
- [Data models](#data-models)
- [Ledger balance behavior](#ledger-balance-behavior)
- [Error responses](#error-responses)
- [Pricing and hosting](#pricing-and-hosting)
- [Developer and license](#developer-and-license)
- [Current limitations](#current-limitations)

## Features

- Create accounts using name, shop name, email, and password.
- Hash passwords before storing them.
- Verify an email address with a six-digit, time-limited email code.
- Authenticate with a signed JSON Web Token (JWT), returned in the login response and set as an HTTP-only cookie.
- Renew an authenticated session for another 24 hours.
- Read and update account details, change passwords, and deactivate an account.
- Record sales and expenses with a description, category, amount, and cash/online payment method.
- Update the user's cash or online Rokar balance when a sale or expense is created.
- Query sales and expenses for a date range.
- Create, list, and delete AEPS transactions, with optional date filtering when listing.
- Limit verification-code send requests to four per five minutes per client.
- Restrict API access to a configured frontend origin using CORS.

## Technology

- Node.js with ECMAScript modules
- Express 5
- MongoDB and Mongoose
- JSON Web Tokens (`jsonwebtoken`)
- `bcryptjs` password hashing
- Resend email API for verification email
- `cookie-parser`, `cors`, `dotenv`, and `express-rate-limit`

## Requirements

- Node.js (use a current LTS release)
- npm
- A MongoDB database and connection URI
- A Resend API key for email verification
- A frontend origin to allow through CORS

## Setup

From this directory:

```bash
npm install
```

Create a `.env` file in `backend/` using the variables listed below. Keep actual credentials private; do not commit `.env`.

Then start the API:

```bash
npm start
```

The server connects to MongoDB before it starts listening. The API base path is:

```text
http://localhost:<PORT>/v1/api
```

For example, with `PORT=3000`, account routes are under `http://localhost:3000/v1/api/user`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Yes | Port on which Express listens. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs. Use a long, random value and keep it private. |
| `FRONTEND_URL` | Yes | Allowed frontend origin for credentialed CORS requests, e.g. `http://localhost:5173`. |
| `RESEND_API_KEY` | Yes for sending verification email | API key used by Resend. |
| `SALT_ROUNDS` | No | Bcrypt cost factor; defaults to `12` if unset or invalid. Values below `4` are ignored. |
| `NODE_ENV` | No | Set to `production` in deployment; controls the `secure` cookie flag. |

Example values (replace placeholders; never use these placeholders as production credentials):

```dotenv
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/dailyrokar
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=re_replace_with_your_resend_api_key
SALT_ROUNDS=12
NODE_ENV=development
```

The email sender is currently configured in code as `DailyRokar <onboarding@resend.dev>`. Configure a verified sender/domain in Resend before production email delivery.

## Run the server

```bash
npm start
```

The package does not currently define a development watch command or an automated test suite. `npm test` is a placeholder that exits with an error.

## API overview

All endpoints are prefixed with `/v1/api`.

| Area | Base path | Purpose |
| --- | --- | --- |
| User and authentication | `/user` | Registration, login, profile, email verification, password, session, and account actions. |
| Sales and expenses | `/record` | Create, list, and delete ledger records. |
| AEPS | `/aeps` | Create, list, and delete AEPS transactions. |

Requests with JSON bodies should send `Content-Type: application/json`. API responses use JSON; most include a `success` boolean and a `message`.

## Authentication

After a successful login, the API returns a JWT and also sets it in an HTTP-only cookie. Protected routes accept either:

```http
Authorization: Bearer <token>
```

or the `token` cookie.

JWTs expire after **24 hours**. The protected `POST /user/refresh-token` route issues a fresh 24-hour token. Protected endpoints also check that the user still exists, has a verified email, and is active.

## API reference

In the following examples, assume:

```text
API_BASE=http://localhost:3000/v1/api
```

### User and authentication

| Method | Path | Auth required | Purpose |
| --- | --- | --- | --- |
| `POST` | `/user/sign-up` | No | Register an account. |
| `POST` | `/user/login` | No | Verify credentials and start a session. |
| `POST` | `/user/logout` | No | Clear the authentication cookie. |
| `POST` | `/user/refresh-token` | Yes | Issue a new 24-hour token. |
| `GET` | `/user` | Yes | Fetch the current profile. |
| `PATCH` | `/user/update` | Yes | Update name, shop name, or password. |
| `PATCH` | `/user/update-password` | No | Change a password using email and a new password. |
| `POST` | `/user/sent-otp` | No | Send a six-digit code to an email address. Limited to 4 requests per 5 minutes. |
| `POST` | `/user/verify-otp` | No | Verify a code and mark the matching account's email verified. |
| `PATCH` | `/user/update-verified-email` | Yes | Mark the authenticated account's email as verified. |
| `PATCH` | `/user/deactivate-account` | Yes | Deactivate the authenticated account. |

#### Register

```http
POST /v1/api/user/sign-up
Content-Type: application/json
```

```json
{
  "name": "Asha Patel",
  "shopName": "Asha General Store",
  "email": "asha@example.com",
  "password": "a-strong-password"
}
```

Name must be 3–20 characters, shop name 3–30 characters, and password at least 8 characters. Registration creates an account with email verification disabled. Request a code using `/user/sent-otp`, then verify it using `/user/verify-otp`.

#### Send and verify an email code

```http
POST /v1/api/user/sent-otp
Content-Type: application/json
```

```json
{ "email": "asha@example.com" }
```

Codes contain six digits and expire after 10 minutes.

```http
POST /v1/api/user/verify-otp
Content-Type: application/json
```

```json
{
  "email": "asha@example.com",
  "otp": "123456"
}
```

#### Login and refresh a session

```http
POST /v1/api/user/login
Content-Type: application/json
```

```json
{
  "email": "asha@example.com",
  "password": "a-strong-password"
}
```

A successful response contains `user` and `token`; a cookie is also set. Use the token as a Bearer token or allow the HTTP-only cookie to be sent with subsequent requests.

```http
POST /v1/api/user/refresh-token
Authorization: Bearer <token>
```

#### Profile and account actions

`GET /v1/api/user` returns the current user profile without the password hash.

`PATCH /v1/api/user/update` accepts one or more of:

```json
{
  "name": "Asha Patel",
  "shopName": "Asha General Store",
  "password": "a-different-strong-password"
}
```

Only supplied fields are updated. Names and shop names are validated; a changed password must be 8–128 characters and differ from the current password.

`PATCH /v1/api/user/update-password` currently accepts:

```json
{
  "email": "asha@example.com",
  "password": "a-different-strong-password"
}
```

This route is currently unauthenticated and does not require an OTP or current password. Review and secure this flow before production use.

`POST /v1/api/user/logout` clears the cookie. The frontend should also discard its stored Bearer token.

`PATCH /v1/api/user/deactivate-account` deactivates the currently authenticated account.

### Sales and expenses

| Method | Path | Auth required | Purpose |
| --- | --- | --- | --- |
| `POST` | `/record/add` | Yes | Create a sale or expense and update its corresponding balance. |
| `GET` | `/record/all` | Yes | List the authenticated user's records; supports `startDate` and `endDate`. |
| `DELETE` | `/record/delete/:recordId` | Yes | Delete one of the authenticated user's records. |

Create a record:

```http
POST /v1/api/record/add
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "description": "Counter sales",
  "category": "Retail sales",
  "type": "sale",
  "amount": 8450,
  "payment": "Cash"
}
```

`type` must be `sale` or `expense`. `payment` must be `Cash` or `Online`. `amount` must be a positive number. Description is 3–20 characters. Category must contain at least 3 characters.

Query a date range:

```http
GET /v1/api/record/all?startDate=2026-10-01&endDate=2026-10-22
Authorization: Bearer <token>
```

Date bounds are inclusive and interpreted in India Standard Time (`+05:30`). Either date can be omitted.

### AEPS

| Method | Path | Auth required | Purpose |
| --- | --- | --- | --- |
| `POST` | `/aeps/add` | Yes | Create an AEPS transaction. |
| `GET` | `/aeps/all` | Yes | List AEPS transactions; supports `startDate` and `endDate`. |
| `DELETE` | `/aeps/delete/:transactionId` | Yes | Delete one of the authenticated user's AEPS transactions. |

Create an AEPS transaction:

```http
POST /v1/api/aeps/add
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "Customer Name",
  "adharNumber": "123456789012",
  "type": "Withdrawal",
  "amount": 1000
}
```

The current API requires a name and positive amount; if an Aadhaar number is provided, it must contain 12 characters. `type` is stored as the transaction type and defaults to `withdrawal` in the model.

List AEPS transactions for a date range:

```http
GET /v1/api/aeps/all?startDate=2026-10-01&endDate=2026-10-22
Authorization: Bearer <token>
```

### Health and unknown routes

There is no dedicated health-check endpoint at present. Unknown API paths return HTTP `404` with a JSON response:

```json
{ "message": "Route not found", "success": false }
```

## Data models

### User

- `name`, `shopName`, `email`, and hashed `password`
- `rokar` and `rokarOnline` for cash and online ledger balances
- `aeps` and `aepsOnline` for AEPS balance fields
- `isEmailVerified` and `isActive`
- Mongoose `createdAt` and `updatedAt` timestamps

Email is unique. Passwords are stored as bcrypt hashes.

### Record

- `userId` reference to the owner
- `description`, `category`, `payment`, `amount`, and `type`
- Mongoose `createdAt` and `updatedAt` timestamps

### AEPS transaction

- `userId` reference to the owner
- `name`, optional `adharNumber`, `type`, and `amount`
- Mongoose `createdAt` and `updatedAt` timestamps

### OTP

- Unique email, OTP, and expiration timestamp
- MongoDB TTL index on `expiresAt` for eventual cleanup
- Code validity is checked against the current time when submitted

## Ledger balance behavior

When a sale or expense is created:

| Record | Payment | Balance change |
| --- | --- | --- |
| Sale | Cash | Add amount to `user.rokar`. |
| Sale | Online | Add amount to `user.rokarOnline`. |
| Expense | Cash | Subtract amount from `user.rokar`. |
| Expense | Online | Subtract amount from `user.rokarOnline`. |

The balance update is performed by the backend. If saving the new record fails, the backend attempts to roll the balance change back. The successful create response includes the created record and the updated Rokar balances.

## Error responses

Validation and authentication failures generally include an HTTP error status and JSON with a `message` and `success: false`. Common statuses include:

- `400` — invalid input or request
- `401` — missing, invalid, or expired authentication
- `403` — account is not verified or is inactive
- `404` — resource or route not found
- `500` — unexpected server or service failure

## Pricing and hosting

This repository does not implement subscriptions, payment collection, usage metering, or paid plans. **No DailyRokar product pricing is defined by the backend code.** Running a deployment may incur separate charges from your MongoDB host, application host, domain provider, and Resend/email provider; check those providers' current pricing.

## Developer and license

- **Product:** DailyRokar
- **Developed by:** Project contributors. Individual or organization attribution is not specified in the repository; update this section with the maintainers' preferred attribution.
- **License:** The backend package metadata declares ISC. Confirm that this is the intended repository-wide license and include a corresponding `LICENSE` file at the repository root.

## Current limitations

- `npm test` is a placeholder; no automated backend tests are configured.
- No dedicated health endpoint or API documentation/OpenAPI schema is configured.
- Deleting a sales/expense record currently does not reverse the corresponding user balance adjustment. Similarly, AEPS create/delete operations currently do not modify `aeps` or `aepsOnline`.
- Existing transactions are not automatically backfilled into user balance fields.
- The unauthenticated password-change route should be reviewed and protected with an appropriate verification flow before production use.
- Email delivery uses a Resend test sender in code and requires production sender configuration.
