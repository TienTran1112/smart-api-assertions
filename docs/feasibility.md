# Feasibility gate (W2)

Plan section 2. Question: does Onix Work return enough **server-written text** to seed the
dataset from real responses (Track A), or is a mock API needed (Track B)?

**Date:** 2026-11-18. **Server:** `openapi-test.onixwork.com` (Swagger v1: 57 paths, 67
operations; saved in `postman/specs/onix-work-public-api-v1.json`). **Account:** the test account from `.env`, plus no token.
**Raw data:** `data/raw/onix-capture-2026-11-18.jsonl` (39 probes, written by
`npm run capture`). Login cases come from `login-errors.spec.ts` and plan section 2.

## How the probes were chosen

`tests/onix-work/api/capture/capture-probes.ts` lists 39 bad requests on 26 endpoints. None of
them can change data:

- GET: any bad input (wrong type, unknown ID, unknown language code, no token).
- POST: only bodies rejected before the action runs (malformed JSON, wrong JSON type, missing
  required field, wrong content type), or a POST under an ID that does not exist.
- PATCH: only on ID `2147483647`, which does not exist.

All 39 got a 4xx or 5xx response, except 3 that got 2xx with no message: `204` for an unknown
product and an unknown equipment ID, and `200` for an unknown `locationExternalId`.

## Text-field table

Column "Author": **Onix** = text written by Onix developers; **ASP.NET** / **System.Text.Json**
= default text from the framework, used unchanged by Onix. "Rewordable?" = could the wording
change in a later release without the meaning changing?

| # | Endpoint(s) | Trigger | Status | Field | Message text (real) | Author | Rewordable? |
|---|---|---|---|---|---|---|---|
| 1 | `POST /v1/Account/token` | wrong password / unknown user | 400 | `title` | "Bad Request" | ASP.NET | yes |
| 2 | `POST /v1/Account/token` | empty username and password | 400 | `errors.Username`, `errors.Password` | "The Username field is required." / "The Password field is required." | ASP.NET | yes |
| 3 | `POST /v1/Account/token` | JSON content type, empty body | 400 | `errors[""]` | "A non-empty request body is required." | ASP.NET | yes |
| 4 | 7 lookup lists (`document-types`, `properties`, `control-categories`, `order-statuses`, `forms`, `job-types`, `equipment/{id}/properties`) | `languageCode=2` or `999` | 400 | `errorMessage` (+ `memberNames`) | "2 invalid language", "999 invalid language" | Onix | yes |
| 5 | `GET /v1/company/products` | `LanguageCode=999` | 400 | `errors.LanguageCode` | "languageCode is not valid" | Onix | yes |
| 6 | `GET /v1/company/products/{id}/rules`, `PATCH /v1/company/products/{id}`, `GET /v1/company/locations/{id}`, `GET /v1/company/areas/{id}` | ID does not exist | 400 | `errorMessage` (rules: inside an array) | "2147483647 invalid" | Onix | yes |
| 7 | `GET /v1/company/{companyId}` | another company (1) **and** an ID that does not exist | 400 | `errorMessage` | "Your company cannot access to company 1" | Onix | yes (also has a grammar error) |
| 8 | `POST /v1/equipment/quantity-adjustment` | empty body `{}` | **500** | whole body (plain text, but `Content-Type: application/json`) | "Oops, something went wrong wrong: 'Object reference not set to an instance of an object.'. Contact support@onix.com for further supporting" | Onix wrapper around a .NET exception | yes |
| 9 | 6 endpoints (path IDs, query filters, `languageCode=abc`) | value is not a number / not a date | 400 | `errors.<param>` | "The value 'abc' is not valid." / "The value 'not-a-date' is not valid for ChangedFromUtcDatetime." | ASP.NET | yes |
| 10 | `PATCH /v1/company/locations/{id}`, `PATCH /v1/equipment/{id}` | string longer than 50 | 400 | `errors.<Field>` | "The field ImportId must be a string with a maximum length of 50." | ASP.NET | yes |
| 11 | `POST /v1/equipment/{id}/issues` | description longer than 250 | 400 | `errors.Description` | "The field Description must be a string or array type with a maximum length of '250'." | ASP.NET | yes |
| 12 | `POST /v1/company/locations`, `/v1/orders`, `/v1/jobs`, `/v1/equipment/quantity-adjustment`, `/v1/jobs/{id}/documents` | body could not be read / required field missing | 400 | `errors.<dto>`, `errors.<Field>` | "The location field is required.", "The data field is required.", "The ContentType field is required." | ASP.NET | yes |
| 13 | same POSTs + login | JSON value of the wrong type | 400 | `errors["$.<field>"]` | "The JSON value could not be converted to System.Nullable\`1[System.Int32]. Path: $.orderId \| LineNumber: 0 \| BytePositionInLine: 16." | System.Text.Json | yes |
| 14 | `POST /v1/orders`, login | malformed JSON | 400 | `errors["$.<field>"]` | "Expected depth to be zero at the end of the JSON payload. … LineNumber: 0 \| BytePositionInLine: …" | System.Text.Json | yes |
| 15 | every 400 problem+json | any validation error | 400 | `title` | "One or more validation errors occurred." | ASP.NET | yes |
| – | all endpoints | no token, bad Bearer, bad `Key` | 401 | – | empty body | – | – |
| – | `POST /v1/equipment` | `text/plain` body | 415 | – | empty body | – | – |

## Counts against the gate rule

| Gate condition (plan section 2) | Result | Met? |
|---|---|---|
| ≥ 3 endpoints/fields with server-written text | 27 endpoints probed (26 in the capture + login), 25 returned text; 4 text fields (`title`, `errors.*`, `errorMessage`, plain-text 500 body) | **yes** |
| ≥ 40 different real messages | **30** distinct strings so far (25 in the capture + 5 from login). They come from **15 templates**; 5 templates are written by Onix, 10 are framework defaults | **not yet**, but reachable (see below) |

The 40-string count is easy to reach: each DTO has dozens of fields with a maximum length or
a number type, and each gives a new string ("The field SerialNumber …", "The field Placement
…"). But those are the same template with another field name, so they add little meaning
variety. The honest number for the dataset is the **15 templates × the endpoints where they
appear**. That gives about 40–60 different real **scenarios**, not 150.

## Findings that are useful for the thesis

1. **Real defect cases exist.** Row 8 (500) shows an internal .NET exception text to the API
   client, and has a doubled word ("wrong wrong"). Rows 13–14 show .NET type names
   (``System.Nullable`1[System.Int32]``) and parser positions. These are real FAIL cases for a
   "no internal details" criterion, as the plan expected.
2. **Row 7 is a good PASS case for "does not reveal existence".** A company that does not exist
   and a company owned by someone else get the same message.
3. **Row 6 is a good case for the "INSUFFICIENT_SPEC" / weak-message discussion.** "2147483647
   invalid" is correct but tells the user almost nothing.
4. **Two error formats.** Onix-written errors use `{ memberNames, errorMessage }` (once wrapped
   in an array); framework errors use problem+json. A real deterministic check needs both.
5. **"Not found" is not consistent:** `204` empty, `200` empty list, or `400 "… invalid"`,
   depending on the endpoint.
6. No message is localized: `languageCode` changes lookup data, not error text.

## Recommendation: **Mixed** track

- **Real seeds (Track A part):** one family per real template × endpoint context (about
  40–60 families). The original variant is the real Onix text; provenance `real`.
- **Mock part (Track B part):** the remaining ~90–110 families come from a small mock API with
  Onix-shaped responses (both error formats), for scenarios Onix does not have: business-rule
  messages, permission messages, duplicate records, status explanations.
- Report the two groups separately (plan section 2, "Mixed").

Why not pure Track A: 15 templates cannot give 150 different families without inventing
scenarios, and most real messages are framework defaults. Why not pure Track B: the real
defects in rows 8, 13 and 14 are the strongest evidence that the problem is real.

**Still open, and it can change this:** the data-permission answer
(`docs/drafts/data-permission-email.md`). If the answer is "no", all real text stays local and
the plan becomes Track B, with Onix used only for the live demo.

**Decision:** to be agreed with the supervisor at Checkpoint 1.
