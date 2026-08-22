# API.md: PocketFlow

## Authentication & Authorization

Authentication is handled via Auth0, utilizing OAuth 2.0 and JSON Web Tokens (JWTs). After successful authentication, clients will receive a JWT. This token must be included in the `Authorization` header of all protected API requests.

**Header Format:**
`Authorization: Bearer <JWT_TOKEN>`

All endpoints described below require an authenticated user unless explicitly stated otherwise. The backend will validate the JWT for authenticity and expiration, and extract user identity for authorization checks.

## Standard Response & Pagination Formats

All API responses will adhere to a consistent JSON structure.

**Success Response:**
For successful operations, the response will include a `success` flag and a `data` object or `message`.

```json
// Example: Data retrieval
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "Groceries",
    "budgetAmount": 500.00
  }
}

// Example: Operation success without specific data
{
  "success": true,
  "message": "Resource created successfully."
}
```

**Error Response:**
For errors, the response will include a `success` flag set to `false` and an `error` object containing a `code` and a `message`.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "The provided amount is not valid."
  }
}
```

**Pagination Format:**
For endpoints returning lists of resources, pagination details will be included in a `pagination` object alongside the `data` array.

```json
{
  "success": true,
  "data": [
    { /* item 1 */ },
    { /* item 2 */ }
  ],
  "pagination": {
    "totalItems": 100,
    "totalPages": 10,
    "currentPage": 1,
    "itemsPerPage": 10
  }
}
```

## API Endpoints

### User Management

#### GET /users/me

*   **Description:** Retrieves the authenticated user's profile information.
*   **Auth Level:** Authenticated User
*   **Request Body:** None
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "user-uuid-abc",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "currency": "USD",
        "createdAt": "2023-01-01T10:00:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Successfully retrieved user profile.
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `403 Forbidden`: User does not have permission (should not occur for `/me`).
    *   `500 Internal Server Error`: An unexpected server error occurred.

    #### GET /onboarding

    *   **Description:** Returns the authenticated user's onboarding status.
    *   **Response Body (200 OK):** `{ "success": true, "data": { "status": "pending", "canSkip": true } }`

    #### POST /onboarding

    *   **Description:** Completes onboarding, optionally creating starter envelopes, or skips it.
    *   **Request Body:** `{ "displayName": "Alex Morgan", "skip": false, "starterEnvelopes": ["Groceries", "Transport", "Fun"] }`
    *   **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `409 Conflict`, `503 Service Unavailable`.

### Dashboard

#### GET /dashboard

*   **Description:** Retrieves the authenticated user's dashboard summary, envelopes, and latest transactions.
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "availableToSpend": 0,
        "monthlyIncome": 0,
        "spent": 0,
        "healthScore": 0,
        "envelopes": [],
        "transactions": []
      }
    }
    ```
*   **Status Codes:** `200 OK`, `401 Unauthorized`, `404 Not Found`.

### Budget Envelopes

All envelope endpoints require authentication and use the standard success/error response format.

#### GET /api/envelopes

Returns all envelopes owned by the authenticated user, ordered by creation date and name. Request body: none. Success response: `200 { "success": true, "data": [EnvelopeItem] }`. Possible errors: `401 UNAUTHORIZED`, `404 USER_NOT_FOUND`, `503 DATABASE_UNAVAILABLE`.

Each `EnvelopeItem` in the response includes the following key fields:

| Field | Type | Description |
|:---|:---|:---|
| `id` | string | Unique envelope identifier. |
| `name` | string | Envelope display name. |
| `categoryId` | string | Associated category ID. |
| `budgetedAmount` | number | Total budget allocated to the envelope for the current cycle. |
| `currentAmount` | number | **Remaining balance** in the envelope. Can be negative when over-spending. |
| `totalSpent` | number | Total expense amount logged against the envelope (`budgetedAmount - currentAmount`). |
| `remainingAmount` | number | Remaining balance (alias of `currentAmount`). |
| `isOverBudget` | boolean | **Now indicates `currentAmount < 0`** (negative balance / over-spending), not `totalSpent > budgetedAmount` as before. See note below. |
| `relatedTransactionCount` | number | Count of transactions linked to the envelope. |

> **Note — `isOverBudget` semantics changed:** `isOverBudget` now indicates `currentAmount < 0` (negative balance / over-spending), not `totalSpent > budgetedAmount` as before. The field name is kept for backward compatibility; new clients should treat `isOverBudget === true` as "envelope is over-spending".

Example `EnvelopeItem`:

```json
{
  "id": "envelope-uuid-123",
  "name": "Groceries",
  "categoryId": "category-uuid-123",
  "budgetedAmount": 1000000,
  "currentAmount": 300000,
  "totalSpent": 700000,
  "remainingAmount": 300000,
  "isOverBudget": false,
  "relatedTransactionCount": 5
}
```

#### GET /api/envelopes/:id

Returns one envelope, including category and spending summary: `relatedTransactionCount`, `totalSpent`, `remainingAmount`, and `isOverBudget`. Request body: none. Possible errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`, `503 DATABASE_UNAVAILABLE`.

Example response:

```json
{
  "success": true,
  "data": {
    "id": "envelope-uuid-123",
    "name": "Groceries",
    "categoryId": "category-uuid-123",
    "budgetedAmount": 1000000,
    "currentAmount": -200000,
    "totalSpent": 1200000,
    "remainingAmount": -200000,
    "isOverBudget": true,
    "relatedTransactionCount": 6
  }
}
```

> `totalSpent` is the aggregated expense total for the envelope; `currentAmount` (and its alias `remainingAmount`) is the remaining balance, which goes negative when over-spending. `isOverBudget` is `true` when `currentAmount < 0` (see the note at `GET /api/envelopes`).

#### GET /api/envelopes/:id/delete-preview

Returns the balance and number of transactions that would be deleted. Request body: none.

```json
{
  "success": true,
  "data": {
    "envelopeId": "envelope-uuid-123",
    "currentAmount": 250,
    "relatedTransactionCount": 4,
    "requiresBalanceAction": true
  }
}
```

Possible errors: `401 UNAUTHORIZED`, `404 NOT_FOUND`, `503 DATABASE_UNAVAILABLE`.

#### POST /api/envelopes

Creates an envelope.

```json
{
  "name": "Groceries",
  "categoryId": "category-uuid-123",
  "budgetedAmount": 500,
  "resetFrequency": "monthly"
}
```

Returns `201 Created` with an `EnvelopeItem`. Names are unique per user. Possible errors: `400 INVALID_INPUT`, `401 UNAUTHORIZED`, `404 CATEGORY_NOT_FOUND`, `409 DUPLICATE_NAME`, `503 DATABASE_UNAVAILABLE`.

#### PUT /api/envelopes/:id

Updates any provided envelope fields.

```json
{
  "budgetedAmount": 650,
  "resetFrequency": "weekly"
}
```

Returns `200 { "success": true, "data": EnvelopeItem }`. Possible errors: `400 INVALID_INPUT`, `401 UNAUTHORIZED`, `404 NOT_FOUND` or `CATEGORY_NOT_FOUND`, `409 DUPLICATE_NAME`, `503 DATABASE_UNAVAILABLE`.

#### POST /api/envelopes/:id/fill

Allocates funds from `Available to Spend` and records a manual transfer transaction.

```json
{ "amount": 250 }
```

Returns `200 { "success": true, "data": EnvelopeItem }`. Returns `400` with `INSUFFICIENT_AVAILABLE_FUNDS` when the amount exceeds available income minus all envelope balances. Other errors: `400 INVALID_INPUT`, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `503 DATABASE_UNAVAILABLE`.

#### POST /api/envelopes/transfer

Moves funds between two envelopes and records a manual transfer transaction.

```json
{
  "fromEnvelopeId": "envelope-uuid-123",
  "toEnvelopeId": "envelope-uuid-456",
  "amount": 75
}
```

Returns `200 { "success": true, "message": "Envelope funds transferred successfully." }`. Possible errors: `400 INVALID_INPUT` or `INSUFFICIENT_ENVELOPE_FUNDS`, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `503 DATABASE_UNAVAILABLE`.

#### DELETE /api/envelopes/:id

Deletes an envelope and all transactions where it is the source or destination. A zero-balance envelope can be deleted directly. For a non-zero balance, choose exactly one action:

```json
{ "transferToEnvelopeId": "envelope-uuid-456" }
```

Or explicitly return the balance to Available to Spend:

```json
{ "returnToAvailableToSpend": true }
```

Returns `200 { "success": true, "message": "Envelope and associated transactions deleted successfully." }`. Possible errors: `400 INVALID_INPUT`, `ENVELOPE_BALANCE_REQUIRES_ACTION`, or invalid target, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `503 DATABASE_UNAVAILABLE`.

**Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict` (duplicate name), `503 Service Unavailable`.

### Transactions

#### POST /transactions

*   **Description:** Manually adds a new transaction (income, expense, or transfer) for the authenticated user.
*   **Auth Level:** Authenticated User
*   **Request Body (JSON):**
    ```json
    {
      "type": "expense",       // "income", "expense", "transfer"
      "amount": 45.75,
      "description": "Weekly grocery shopping",
      "date": "2023-10-26T18:00:00Z",
      "envelopeId": "envelope-uuid-123", // Required for expense and transfer (source), MUST NOT be provided for income
      "destinationEnvelopeId": "envelope-uuid-789", // Required for transfer (destination), optional otherwise
      "sourceAccountId": "account-uuid-456", // Optional in MVP (Phase 1)
      "destinationAccountId": "account-uuid-789", // Optional in MVP (Phase 1)
      "receiptImageUrl": "https://r2.cloudflarestorage.com/receipts/receipt-uuid-xyz.jpg" // Optional
    }
    ```
*   **Important Notes:**
    *   **Income transactions:** `envelopeId` MUST NOT be provided. Income is added to the "Available to Spend" pool. To allocate income to an envelope, use the "Fill Envelope" endpoint (`POST /envelopes/:id/fill`).
    *   **Expense transactions:** `envelopeId` is required. The amount will be deducted from the specified envelope.
    *   **Transfer transactions:** Both `envelopeId` (source) and `destinationEnvelopeId` are required.
*   **Response Body (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "id": "transaction-uuid-def",
        "type": "expense",
        "amount": 45.75,
        "description": "Weekly grocery shopping",
        "date": "2023-10-26T18:00:00Z",
        "envelopeId": "envelope-uuid-123",
        "destinationEnvelopeId": null,
        "sourceAccountId": null,
        "destinationAccountId": null,
        "receiptImageUrl": "https://r2.cloudflarestorage.com/receipts/receipt-uuid-xyz.jpg",
        "userId": "user-uuid-abc",
        "createdAt": "2023-10-27T14:35:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `201 Created`: Transaction successfully added.
    *   `400 Bad Request`: Invalid input data (e.g., missing required fields, invalid type, non-positive amount, providing envelopeId for income transactions).
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `404 Not Found`: Specified `envelopeId` does not exist for the user.
    *   `500 Internal Server Error`: An unexpected server error occurred.
*   **Error Codes:**
    *   `INVALID_INPUT`: Income transactions cannot be assigned to an envelope, or other validation failures.
    *   `NOT_FOUND`: Envelope not found for the authenticated user.

#### GET /transactions

*   **Description:** Retrieves a paginated list of transactions for the authenticated user, with optional filtering.
*   **Auth Level:** Authenticated User
*   **Query Parameters:**
    *   `page` (integer, default: 1): Page number.
    *   `limit` (integer, default: 10, max: 50): Number of items per page.
    *   `type` (string, optional): Filter by transaction type (`income`, `expense`, `transfer`).
    *   `envelopeId` (string, optional): Filter by a specific envelope.
    *   `startDate` (string, optional, ISO 8601): Filter transactions from this date onwards.
    *   `endDate` (string, optional, ISO 8601): Filter transactions up to this date.
*   **Request Body:** None
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "transaction-uuid-def",
          "type": "expense",
          "amount": 45.75,
          "description": "Weekly grocery shopping",
          "date": "2023-10-26T18:00:00Z",
          "envelopeId": "envelope-uuid-123",
          "destinationEnvelopeId": null,
          "sourceAccountId": null,
          "destinationAccountId": null,
          "receiptImageUrl": "https://r2.cloudflarestorage.com/receipts/receipt-uuid-xyz.jpg",
          "envelopeName": "Groceries",
          "envelopeColorHex": "#4CAF50",
          "userId": "user-uuid-abc",
          "createdAt": "2023-10-27T14:35:00Z"
        },
        {
          "id": "transaction-uuid-ghi",
          "type": "income",
          "amount": 2000.00,
          "description": "Monthly Salary",
          "date": "2023-10-25T09:00:00Z",
          "envelopeId": null,
          "destinationEnvelopeId": null,
          "sourceAccountId": null,
          "destinationAccountId": null,
          "receiptImageUrl": null,
          "envelopeName": null,
          "envelopeColorHex": null,
          "userId": "user-uuid-abc",
          "createdAt": "2023-10-25T09:00:00Z"
        }
      ],
      "pagination": {
        "totalItems": 25,
        "totalPages": 3,
        "currentPage": 1,
        "itemsPerPage": 10
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Successfully retrieved transactions.
    *   `400 Bad Request`: Invalid query parameters.
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `500 Internal Server Error`: An unexpected server error occurred.

#### GET /transactions/:id

*   **Description:** Retrieves details of a specific transaction owned by the authenticated user.
*   **Auth Level:** Authenticated User
*   **Path Parameters:**
    *   `id` (string, required): The transaction UUID.
*   **Request Body:** None
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "transaction-uuid-def",
        "type": "expense",
        "amount": 45.75,
        "description": "Weekly grocery shopping",
        "date": "2023-10-26T18:00:00Z",
        "envelopeId": "envelope-uuid-123",
        "destinationEnvelopeId": null,
        "sourceAccountId": null,
        "destinationAccountId": null,
        "receiptImageUrl": "https://r2.cloudflarestorage.com/receipts/receipt-uuid-xyz.jpg",
        "envelopeName": "Groceries",
        "envelopeColorHex": "#4CAF50",
        "userId": "user-uuid-abc",
        "createdAt": "2023-10-27T14:35:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Successfully retrieved transaction.
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `404 Not Found`: Transaction not found or does not belong to the authenticated user.
    *   `500 Internal Server Error`: An unexpected server error occurred.

#### PUT /transactions/:id

*   **Description:** Updates an existing transaction and recalculates corresponding envelope balance(s).
*   **Auth Level:** Authenticated User
*   **Path Parameters:**
    *   `id` (string, required): The transaction UUID.
*   **Request Body (JSON):** Partial transaction update fields:
    ```json
    {
      "amount": 60.00,
      "description": "Updated grocery shopping",
      "date": "2023-10-26T18:00:00Z",
      "envelopeId": "envelope-uuid-123",
      "destinationEnvelopeId": null,
      "receiptImageUrl": null
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "transaction-uuid-def",
        "type": "expense",
        "amount": 60.00,
        "description": "Updated grocery shopping",
        "date": "2023-10-26T18:00:00Z",
        "envelopeId": "envelope-uuid-123",
        "destinationEnvelopeId": null,
        "sourceAccountId": null,
        "destinationAccountId": null,
        "receiptImageUrl": null,
        "userId": "user-uuid-abc",
        "createdAt": "2023-10-27T14:35:00Z",
        "updatedAt": "2023-10-27T15:00:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Transaction successfully updated.
    *   `400 Bad Request`: Invalid input data (e.g., non-positive amount, future date > 1 yr).
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `404 Not Found`: Transaction or referenced envelope not found.
    *   `500 Internal Server Error`: An unexpected server error occurred.

#### DELETE /transactions/:id

*   **Description:** Deletes a transaction and restores envelope balances.
*   **Auth Level:** Authenticated User
*   **Path Parameters:**
    *   `id` (string, required): The transaction UUID.
*   **Request Body:** None
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "message": "Transaction deleted successfully."
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Transaction successfully deleted.
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `404 Not Found`: Transaction not found or does not belong to the user.
    *   `500 Internal Server Error`: An unexpected server error occurred.

### Plaid Integration

#### POST /plaid/link-token

*   **Description:** Initiates the Plaid Link flow by generating a `link_token` for the authenticated user. This token is used by the frontend to launch Plaid Link.
*   **Auth Level:** Authenticated User
*   **Request Body (JSON):**
    ```json
    {
      "redirectUri": "https://app.pocketflow.com/plaid/oauth" // Optional, for OAuth flows
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "linkToken": "link-sandbox-a1b2c3d4-e5f6-7890-1234-567890abcdef"
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Successfully generated Plaid Link token.
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `500 Internal Server Error`: An unexpected server error occurred (e.g., Plaid API error).