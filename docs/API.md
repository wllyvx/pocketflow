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
    Each envelope in `data.envelopes` also includes `progressBaseAmount` and `spentAmount`. The frontend uses these values to calculate the current-cycle spending percentage; when `budgetedAmount` is zero, `progressBaseAmount` falls back to funds assigned through income or transfers.
*   **Status Codes:** `200 OK`, `401 Unauthorized`, `404 Not Found`.

### Budget Envelopes

#### POST /envelopes

*   **Description:** Creates a new budget envelope for the authenticated user.
*   **Auth Level:** Authenticated User
*   **Request Body (JSON):**
    ```json
    {
      "name": "Groceries",
      "budgetAmount": 500.00,
      "colorHex": "#4CAF50"
    }
    ```
*   **Response Body (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "id": "envelope-uuid-123",
        "name": "Groceries",
        "budgetAmount": 500.00,
        "currentBalance": 500.00,
        "colorHex": "#4CAF50",
        "userId": "user-uuid-abc",
        "createdAt": "2023-10-27T14:30:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `201 Created`: Envelope successfully created.
    *   `400 Bad Request`: Invalid input data (e.g., missing name, negative amount).
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `500 Internal Server Error`: An unexpected server error occurred.

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
      "envelopeId": "envelope-uuid-123", // Required for expense, optional for income/transfer
      "destinationEnvelopeId": "envelope-uuid-789", // Optional (used for envelope-to-envelope transfer)
      "sourceAccountId": "account-uuid-456", // Optional in MVP (Phase 1)
      "destinationAccountId": "account-uuid-789", // Optional in MVP (Phase 1)
      "receiptImageUrl": "https://r2.cloudflarestorage.com/receipts/receipt-uuid-xyz.jpg" // Optional
    }
    ```
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
    *   `400 Bad Request`: Invalid input data (e.g., missing required fields, invalid type, non-positive amount).
    *   `401 Unauthorized`: Missing or invalid authentication token.
    *   `404 Not Found`: Specified `envelopeId` does not exist for the user.
    *   `500 Internal Server Error`: An unexpected server error occurred.

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