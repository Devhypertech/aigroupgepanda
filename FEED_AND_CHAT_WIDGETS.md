# Feed & Chat Integration

## Feed display and actions

- **Layout**: Feed is a scrollable vertical list (one item per card) with infinite scroll. Items load via `GET /api/feed` with optional `category`, `cursor`, `limit`.
- **Per-card actions**:
  - **Why this matters**: Expandable section with AI-generated insights (calls `POST /api/feed/:id/why`).
  - **Like**: Toggle like; persisted via `POST /api/feed/interact` with `action: 'like'` or `'unlike'`.
  - **Share**: Copy link or Web Share API; link format `{origin}/feed?item={id}`.
  - **Ask Follow-up**: Links to chat with a pre-set message. URL: `/chat?followUp=Tell%20me%20more%20about:%20{title}`.
  - **Save**: `POST /api/feed/:id/save` (save) or `DELETE` (unsave).

## Chat pre-fill from feed

- **URL params**: `followUp` or `message` (decoded). Example: `/chat?followUp=Tell%20me%20more%20about:%20Explore%20Santorini.`
- **Behavior**: When the chat page loads with `followUp`/`message`, after the Stream client and channel are ready the message is sent once automatically, then the query params are removed from the URL.

## Feed API (backend)

- **GET /api/feed**: Paginated feed. Query: `category`, `cursor`, `limit`, `lens`, `interests`. Categories map to tags: `deals`, `guides`, `reels`, `ai-news`, `for-you` (no filter).
- **POST /api/feed/interact**: Body `{ feedItemId, action }`. Actions: `view`, `like`, `unlike`, `save`, `click`, `not_interested`.
- **POST /api/feed/:id/why**: Returns “why this matters” content for a feed item.
- **POST /api/feed/:id/save**, **DELETE /api/feed/:id/save**: Save/unsave.

Next.js rewrites proxy `/api/feed/*` and `/api/chat/*` to the API server so the web app can call them same-origin with credentials.

## Interactive widgets in chat

When the user uses **Ask Follow-up** (or any message), the chat API can return structured UI (e.g. trip form, flight options). The chat client already supports:

- **Trip form**: Collect destination, dates, preferences.
- **Flights / recommendations**: Panels driven by `results` and `uiSchema` (e.g. `tripForm`, `flights`).

These are rendered in the chat UI based on the AI response payload; no extra wiring is needed for “Book flights” / “See recommendations” beyond the existing panels and `uiEvents`.
