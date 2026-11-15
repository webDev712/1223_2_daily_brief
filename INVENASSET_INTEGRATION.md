# InvenAsset integration

InvenAsset provides one generic server API for connected websites. Application registration, manual client IDs, and shared client secrets are not required. A token belongs to one InvenAsset company.

## Connection

A website generates and saves a random state and PKCE verifier on its server, then opens:

`https://invenasset.com/integration_connect.php`

Query parameters: `response_type=code`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`. The challenge is Base64URL(SHA256(verifier)), without padding. State is 32–128 URL-safe characters; verifier is 43–128 PKCE characters. The callback is an absolute HTTPS URL without credentials, query or fragment. HTTP callbacks are allowed only for localhost/127.0.0.1 development.

Sign-in by password or Google takes place only in InvenAsset. Google returns to its existing `/googl_callback.php`, then to the internal company-selection page. The user chooses a company where they have administrator/owner membership and approves the connection.

The website receives a one-time `code`, its `state`, and `iss`. It checks the saved state, issuer, initiating user and company, then POSTs JSON to `/api/integration.php`:

```json
{"action":"exchange","code":"RETURNED_CODE","code_verifier":"SAVED_VERIFIER","redirect_uri":"EXACT_CALLBACK"}
```

The response includes `access_token` (`ia_` + 64 hex characters), `token_type: "Bearer"`, `expires_at`, and `company: {id, name}`. Codes expire in two minutes and can be used once; tokens last 90 days. Store tokens only on the website's server. InvenAsset stores token hashes; Daily Brief stores encrypted tokens.

Include `previous_token` when reconnecting. The old token is revoked. For the same InvenAsset company, existing Issue links move to the new token, and webhook URLs move to the new callback origin while retaining their paths.

## Server API

POST JSON to `https://invenasset.com/api/integration.php` with `Authorization: Bearer TOKEN`.

| Action | Result |
| --- | --- |
| `status` | Current connection and company |
| `revoke` | Revoke this token |
| `issue.options` | Equipment, issue types, and assignees in one response |
| `issue.create` | Create an Issue and its work order using the existing InvenAsset handler |

Creation fields:

```json
{
  "action": "issue.create",
  "source_id": "STABLE_FINDING_ID",
  "equipment": 123,
  "type": 11,
  "priority": 3,
  "assignees": [456],
  "description": "Describe the problem",
  "webhook_url": "https://YOUR-WEBSITE/api/issue-resolution"
}
```

The webhook URL must share the callback's exact origin. The token determines the company. Equipment and assignees must belong to it. Repeating the same source ID with the same connection returns the existing Issue; creation calls are serialized for that source. The response includes `success`, `company_id`, and `request_id`.

Issue types are 11 Mechanical, 12 Electrical, 13 Hydraulic/Pneumatic, 14 Software/Control, 10 Other. Priorities are 1 Low, 2 Medium, 3 High, 4 Critical. Daily Brief maps Info/Moderate/High to 1/2/3. Integrated issue descriptions are stored as supplied without the native UI's AI translation call.

## Resolution webhook

InvenAsset sends the following JSON when the work order is completed:

```json
{"event":"issue.resolved","company_id":123,"request_id":456,"source_id":"FINDING_ID","status":4,"resolved_at":1794585600}
```

The `X-InvenAsset-Signature` header is hexadecimal HMAC-SHA256 of the exact raw body. Its key is the lowercase hexadecimal SHA256 of the API token. Verify the signature before parsing/applying the event, and match the company, request ID and source ID to the saved finding. The token itself is not transmitted in webhook headers.

The payload contains identifiers, completion status and completion time. Work-order notes, costs, attachments and description are not sent.

Automatic delivery requires a public HTTPS receiver on the connected website's origin. Private/reserved IP targets and redirects are rejected. InvenAsset pins the validated public destination IP for the HTTPS request. Delivery has connection/overall timeouts of 3/5 seconds. Failed delivery remains pending and is retried by the existing `cron/reports.php` job; no new cron schedule is needed if that job is already configured.

The Daily Brief endpoint is `/api/integrations/invenasset/webhook/COMPANY_UUID`. It verifies the signature and saved connection, updates the matching Finding to Resolved, and marks its Action Tracker entry Resolved with the resolution time. Finding severity, description, author and historical brief closure remain unchanged. Repeat delivery is safe.

## Daily Brief settings and behavior

Callback and webhook URLs are derived automatically from the incoming Daily Brief request URL. No domain field is required. After moving to a different domain, reconnect InvenAsset from that domain.

In a brief, enable Send to Action Tracker and select category Invenasset. One server request loads equipment, issue types and InvenAsset assignees. Select equipment, type and optional assignee, then add the Finding. The local Finding and Action Tracker row are saved with the returned Issue ID. The selected assignee belongs to InvenAsset; it is not treated as a Daily Brief user ID. Other finding categories retain their existing behavior.

The resolution result appears on reloading the brief or its normal data refresh. Connection alone does not create Issues or events.

Daily Brief server environment: `INVENASSET_BASE_URL` (default `https://invenasset.com`) and `INVENASSET_TOKEN_ENCRYPTION_KEY` (stable random 32 bytes encoded as Base64). `INVENASSET_REDIRECT_URI` and the former client-secret variables are no longer used. Never expose the encryption key or tokens with NEXT_PUBLIC variables.

## Migrations and deployment

InvenAsset main MySQL database (`$db_main`):

- `migrations/2026-11-13-integration.sql` — initial authorization-code and token tables, if not already applied.
- `migrations/2026-11-13-integration-issues.sql` — Issue links and pending delivery state.
- The prior `2026-11-13-work-order-fields.sql` is still required if description/notes are missing from maintenance_request; add only missing columns in the database holding that table.

Daily Brief PostgreSQL:

- `migrations/010_invenasset_connection.sql` — initial saved connection, if not already applied.

The new Issue-link table is in InvenAsset's main database even when the company uses a private database. Issue creation and link insertion use the same MySQL transaction/connection across those databases.

Deploy the changed PHP/API/helper/cron files, migrations and the existing Authorization-forwarding .htaccess rule in InvenAsset. Deploy Daily Brief's integration routes/helper, finding/company routes, pages, types and translations. No Google Cloud configuration changes are required.

The new migrations were applied locally only. Local backend checks covered options, native Issue creation and assignment, Finding forwarding/persistence, duplicates, company isolation, signed resolution handling, Action Tracker updates, and reconnection after an address change. Test records were removed. The receiver was also exercised over local HTTP before the local Next server became unavailable; the final handler/key-rotation check used the same route code directly against the local database.

Production deployment, public HTTPS webhook delivery, and manual browser acceptance have not been performed. Production InvenAsset cannot deliver to a developer's localhost; connect from a reachable public HTTPS address when available.
