# Hotel Search Behavior - Real Hotels & Preference Questions

## Summary

Implemented hotel search behavior with mandatory 5 results and preference questions, using SerpAPI Google Hotels for real hotel data.

## Changes Made

### 1. Created Hotel Search Service
**File**: `apps/api/src/services/hotels/searchHotels.ts` (NEW)

- **Function**: `searchHotels(options: SearchHotelsOptions): Promise<Hotel[]>`
- **Features**:
  - Uses SerpAPI Google Hotels API
  - Normalizes hotels to: `{ id, name, pricePerNight, currency, rating, neighborhood, area, imageUrl, url, source }`
  - Filters by neighborhood preference (city_center, quiet, restaurants, nightlife, family)
  - Sorts by rating (higher first), then by price (lower first)
  - Returns exactly 5 hotels
  - Handles rate limits gracefully
  - Comprehensive logging with `[HOTEL_SEARCH]` prefix

### 2. Updated Chat Responder
**File**: `apps/api/src/routes/chat.ts`

- **Hotel Intent Detection**:
  - Detects keywords: `hotel`, `hotels`, `stay`, `accommodation`, `book a room`, `where to stay`, `lodging`
  - Triggers hotel search when intent detected

- **Conversation Logic**:
  - **Missing Fields**: If city, check-in date, or check-out date is missing, asks for them with CTA buttons
  - **All Fields Present**: Calls `searchHotels()` and returns exactly 5 hotels with preference questions
  - **Field Extraction**: Extracts city and dates from user message or uses `tripState`

- **Preference Questions**:
  - Asks: "Do you want to stay in the city center or a quieter part of town? And do you prefer being near restaurants/shopping, or nightlife/entertainment?"
  - Returns `hotel_list` UI with preference buttons

### 3. Response Format

**With Hotels Found:**
```json
{
  "text": "Here are 5 hotel options I found in Tokyo. Do you want to stay in the city center or a quieter part of town? And do you prefer being near restaurants/shopping, or nightlife/entertainment?",
  "reply": "Here are 5 hotel options I found in Tokyo. Do you want to stay in the city center or a quieter part of town? And do you prefer being near restaurants/shopping, or nightlife/entertainment?",
  "ui": {
    "type": "hotel_list",
    "items": [
      {
        "id": "hotel-1",
        "title": "Luxury Hotel",
        "name": "Luxury Hotel",
        "neighborhood": "Downtown",
        "area": "Downtown",
        "pricePerNight": 150,
        "price": 150,
        "currency": "USD",
        "rating": 4.5,
        "imageUrl": "https://example.com/hotel.jpg",
        "url": "https://example.com/hotel",
        "source": "serpapi_google_hotels"
      }
    ],
    "buttons": [
      {
        "label": "Refine Filters",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "Show cheaper options"
          }
        }
      },
      {
        "label": "City Center",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "I prefer city center hotels"
          }
        }
      },
      {
        "label": "Quieter Area",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "I prefer a quieter area"
          }
        }
      }
    ]
  },
  "sessionId": "ai-user123"
}
```

**Missing Required Fields:**
```json
{
  "text": "To find the best hotels for you, I need a few details:\n\n- city\n- check-in date\n- check-out date\n\nCould you please provide these?",
  "reply": "To find the best hotels for you, I need a few details:\n\n- city\n- check-in date\n- check-out date\n\nCould you please provide these?",
  "ui": {
    "type": "cta_buttons",
    "buttons": [
      {
        "label": "Set City",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "I want to stay in Tokyo"
          }
        }
      },
      {
        "label": "Set Dates",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "Check-in: 2024-06-01, Check-out: 2024-06-05"
          }
        }
      },
      {
        "label": "Set Budget",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "My budget is $150 per night"
          }
        }
      }
    ]
  },
  "sessionId": "ai-user123"
}
```

## Field Extraction

The service extracts:
- **City**: From `tripState.destination` or user message patterns like "hotels in [city]"
- **Dates**: From `tripState.startDate`/`endDate` or user message date patterns
- **Budget**: From `tripState.budget` (optional)
- **Adults**: From `tripState.peopleCount` (defaults to 2)

## Preference Questions

When hotels are found, the assistant asks:
1. **Location preference**: City center vs quieter area
2. **Vibe preference**: Restaurants/shopping vs nightlife/entertainment vs family/relaxation

These preferences can be used to filter hotels in future searches.

## Logging

All hotel searches are logged with `[HOTEL_SEARCH]` prefix:
```
[HOTEL_SEARCH] Searching hotels: { city: "Tokyo", checkIn: "2024-06-01", checkOut: "2024-06-05", budget: 150 }
[HOTEL_SEARCH] Calling SerpAPI Google Hotels...
[HOTEL_SEARCH] ✅ Found 5 hotels (requested 5)
```

Or if fields are missing:
```
[HOTEL_SEARCH] Missing required fields: ["city", "check-in date"]
```

## Rate Limit Handling

The service gracefully handles rate limits:
- Detects rate limit errors (429, "rate limit", "too many requests")
- Returns empty array instead of throwing error
- Logs warning: `[HOTEL_SEARCH] Rate limit detected, returning empty results gracefully`

## Testing

### Test 1: Hotel Intent with All Fields
Send message: "I need hotels in Tokyo from 2024-06-01 to 2024-06-05"

**Expected**:
- Hotel intent detected
- City and dates extracted
- Hotel search triggered
- Returns 5 hotels with `hotel_list` UI and preference questions

### Test 2: Missing Fields
Send message: "I need hotels"

**Expected**:
- Hotel intent detected
- Missing fields identified
- Returns CTA buttons to set city, dates, budget

### Test 3: No Hotels Found
Send message: "I need hotels in a very obscure location"

**Expected**:
- Hotel search returns empty array
- Returns message asking to try different city or dates
- No fake links

## Files Created/Modified

### Created
- `apps/api/src/services/hotels/searchHotels.ts` - Hotel search service

### Modified
- `apps/api/src/routes/chat.ts` - Added hotel intent detection and search integration

## Next Steps

1. **Test with Real API**: Verify SerpAPI Google Hotels API calls work correctly
2. **Improve Field Extraction**: Use NLP to better extract dates and cities from natural language
3. **Add Preference Filtering**: Use neighborhood preferences to filter hotels
4. **Cache Results**: Cache hotel search results to reduce API calls
5. **Add Hotel Details**: Include amenities, reviews, cancellation policies in hotel cards

