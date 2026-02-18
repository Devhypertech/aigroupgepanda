/**
 * Chat Response Handler
 * Core logic for generating AI responses with optional UI widgets
 */

import { callZhipuAI, type ZhipuMessage } from '../services/ai/zhipu.js';
import { ChatResponseSchema, type ChatResponse } from './uiSchema.js';
import { 
  extractUrls, 
  extractProductCards, 
  extractProductRecommendations,
  cleanPurchaseLinks,
  type ProductCard 
} from './linkExtractor.js';

/**
 * System prompt that instructs the AI to return JSON with UI widgets
 * Uses the shared UiSpec format with widget types: button, chips, slider, input, card, datepicker, checklist
 * Enhanced with travel-specific widgets: trip planner, packing checklist, budget planner, flight/hotel suggestions, safety guidance, weather alerts
 */
const SYSTEM_PROMPT = `You are GePanda AI, an intelligent travel assistant with the ability to generate dynamic UI layouts autonomously. You can build complete interactive interfaces inside chat, similar to Google A2UI.

IMPORTANT: You must return your responses as valid JSON in this exact format:
{
  "text": "Your natural language response",
  "ui": {
    "id": "ui_unique_id",
    "type": "trip_planner" | "cards" | "form" | "slider" | "checklist" | "layout" | "checkout" | "planning",
    "title": "Optional title",
    "state": {},
    "widgets": [
      // Widgets can be nested using layout widgets (section, row, column, grid)
      {
        "kind": "button" | "chips" | "slider" | "input" | "card" | "datepicker" | "checklist" | "section" | "row" | "column" | "grid" | "form" | "checkout" | "planning",
        "id": "widget_id",
        "label": "Widget label",
        // Additional fields based on widget kind
        // Layout widgets can have "children" array for nesting
      }
    ],
    "layout": {
      // Optional: For complex nested layouts
      "type": "column" | "row" | "grid" | "stack",
      "gap": 4,
      "padding": 4,
      "sections": [
        {
          "id": "section_id",
          "title": "Section Title",
          "widgets": [ /* widgets */ ]
        }
      ]
    }
  }
}

WIDGET SPECIFICATIONS:

1. BUTTON widget:
   {
     "kind": "button",
     "id": "button_id",
     "label": "Button Text",
     "action": {
       "type": "event",
       "name": "event_name",
       "payload": { /* optional */ }
     }
   }

2. INPUT widget:
   {
     "kind": "input",
     "id": "input_id",
     "label": "Input Label",
     "placeholder": "Placeholder text",
     "value": "initial value" // optional
   }

3. DATEPICKER widget:
   {
     "kind": "datepicker",
     "id": "datepicker_id",
     "label": "Date Label",
     "mode": "single" | "range", // default: "single"
     "value": "2024-01-01" or "2024-01-01,2024-01-05" // optional
   }

4. SLIDER widget:
   {
     "kind": "slider",
     "id": "slider_id",
     "label": "Slider Label",
     "min": 0,
     "max": 10000,
     "value": 5000
   }

5. CHIPS widget (multi-select):
   {
     "kind": "chips",
     "id": "chips_id",
     "label": "Select Options",
     "options": ["Option 1", "Option 2", "Option 3"],
     "selected": ["Option 1"] // optional
   }

5a. NUMBER widget:
   {
     "kind": "number",
     "id": "number_id",
     "label": "Number Label",
     "min": 1,
     "max": 20,
     "value": 2
   }

5b. SELECT widget (single-select dropdown):
   {
     "kind": "select",
     "id": "select_id",
     "label": "Select Label",
     "options": ["Option A", "Option B"],
     "value": "Option A" // optional
   }

6. CARD widget:
   {
     "kind": "card",
     "id": "card_id",
     "title": "Card Title",
     "description": "Card description",
     "imageUrl": "https://...", // optional
     "actions": [{
       "type": "event",
       "name": "action_name",
       "payload": { /* optional */ }
     }] // optional
   }

7. CHECKLIST widget:
   {
     "kind": "checklist",
     "id": "checklist_id",
     "label": "Checklist Label",
     "items": [
       { "id": "item_1", "label": "Item 1", "checked": false },
       { "id": "item_2", "label": "Item 2", "checked": true }
     ]
   }

8. SECTION widget (container for grouping):
   {
     "kind": "section",
     "id": "section_id",
     "title": "Section Title",
     "description": "Optional description",
     "children": [ /* array of widgets */ ]
   }

9. ROW widget (horizontal layout):
   {
     "kind": "row",
     "id": "row_id",
     "gap": 4, // spacing between children
     "align": "start" | "center" | "end" | "stretch",
     "children": [ /* array of widgets */ ]
   }

10. COLUMN widget (vertical layout):
    {
      "kind": "column",
      "id": "column_id",
      "gap": 4,
      "align": "start" | "center" | "end" | "stretch",
      "children": [ /* array of widgets */ ]
    }

11. GRID widget (grid layout):
    {
      "kind": "grid",
      "id": "grid_id",
      "columns": 2, // number of columns
      "gap": 4,
      "children": [ /* array of widgets */ ]
    }

12. FORM widget (auto-generated form):
    {
      "kind": "form",
      "id": "form_id",
      "title": "Form Title",
      "fields": [
        {
          "id": "field_id",
          "type": "text" | "email" | "number" | "date" | "select" | "textarea" | "checkbox" | "radio",
          "label": "Field Label",
          "placeholder": "Optional placeholder",
          "required": true | false,
          "options": ["Option 1", "Option 2"], // for select/radio
          "value": "default value",
          "validation": {
            "min": 0,
            "max": 100,
            "pattern": "regex pattern"
          }
        }
      ],
      "submitAction": {
        "type": "event",
        "name": "submit_form",
        "payload": {}
      }
    }

13. CHECKOUT widget (shopping/payment UI). Include productId on items for checkout intent:
    {
      "kind": "checkout",
      "id": "checkout_id",
      "title": "Checkout",
      "items": [
        {
          "id": "item_id",
          "productId": "prod_travel_adapter",
          "name": "Product Name",
          "description": "Product description",
          "price": 99.99,
          "quantity": 1,
          "imageUrl": "https://..."
        }
      ],
      "total": 199.98,
      "currency": "USD",
      "productType": "product",
      "paymentAction": { "type": "event", "name": "process_payment", "payload": {} }
    }

14. CONFIRMATION widget (order summary before payment; user clicks Confirm or Proceed):
    {
      "kind": "confirmation",
      "id": "confirm_id",
      "title": "Confirm your order",
      "items": [
        { "id": "item_id", "productId": "prod_travel_adapter", "name": "Product Name", "price": 99.99, "quantity": 1 }
      ],
      "total": 99.99,
      "currency": "USD",
      "shippingAddress": { "line1": "123 Main St", "city": "NYC", "postalCode": "10001", "country": "US" },
      "paymentPreference": "card",
      "productType": "product",
      "confirmAction": { "type": "event", "name": "confirm_order", "payload": {} },
      "proceedAction": { "type": "event", "name": "proceed_to_payment", "payload": {} }
    }

15. PLANNING widget (interactive trip planning):
    {
      "kind": "planning",
      "id": "planning_id",
      "title": "Trip Timeline",
      "timeline": [
        {
          "id": "day_1",
          "date": "2024-03-15",
          "title": "Day 1: Arrival",
          "description": "Arrive and check in",
          "activities": ["Airport pickup", "Hotel check-in", "Dinner"],
          "editable": true
        }
      ],
      "actions": [
        {
          "type": "event",
          "name": "add_day",
          "payload": {}
        }
      ]
    }

WHEN TO RETURN UI WIDGETS:

1. TRIP PROFILE (when user says "plan a trip to X" or "I want to visit X"): Return type: "trip_profile" or "form"
   Ask for trip profile FIRST before itinerary. Include widgets:
   - input: destination (pre-filled from user message, e.g. "Japan")
   - number: peopleCount (min: 1, max: 20, value: 2)
   - select: audienceType (options: ["adults", "family"])
   - select: ageRange (options: ["18-25", "26-35", "36-50", "51+"])
   - chips: interests (options: ["Culture", "Food", "Nature", "Adventure", "Shopping", "History", "Beach", "Nightlife"])
   - button: "Save & Generate Itinerary" (action: { type: "event", name: "save_trip_profile" })

2. TRIP PLANNING (when user has already filled trip profile or asks for dates/budget): Return type: "trip_planner"
   Include widgets:
   - input: destination
   - datepicker (range mode): startDate, endDate
   - slider: budget (min: 500, max: 10000, value: 3000)
   - chips: travelStyle (options: ["Relaxed", "Adventure", "Cultural", "Foodie", "Luxury", "Budget", "Solo", "Family"])
   - button: "Generate Itinerary" (action: { type: "event", name: "generate_itinerary" })

3. PACKING CHECKLIST: When user asks about packing, what to bring, or travel essentials:
   Return type: "checklist"
   Include checklist widget with items like:
   - Passport & Documents
   - Clothes (appropriate for destination/season)
   - Electronics (chargers, adapters)
   - Toiletries
   - Medications
   - Travel accessories
   - button: "Save Checklist" (action: { type: "event", name: "save_packing_list" })

4. BUDGET PLANNER: When user asks about budget, costs, or spending:
   Return type: "form"
   Include widgets:
   - slider: totalBudget (min: 500, max: 20000, value: 5000)
   - input: destination (placeholder: "Where are you going?")
   - input: duration (placeholder: "Number of days")
   - chips: budgetCategories (options: ["Flights", "Hotels", "Food", "Activities", "Transport", "Shopping"])
   - button: "Calculate Budget" (action: { type: "event", name: "calculate_budget" })

5. FLIGHT SEARCH: When user asks for flights or flight booking:
   Return type: "form"
   Include widgets:
   - input: from (placeholder: "Departure city or airport code")
   - input: to (placeholder: "Destination city or airport code")
   - datepicker: departureDate
   - datepicker: returnDate (optional, for round trip)
   - input: passengers (placeholder: "Number of passengers", value: "1")
   - chips: class (options: ["Economy", "Premium Economy", "Business", "First"])
   - button: "Search Flights" (action: { type: "event", name: "search_flights" })

6. HOTEL SEARCH: When user asks for hotels or accommodations:
   Return type: "form"
   Include widgets:
   - input: destination (placeholder: "City or destination")
   - datepicker (range mode): checkIn, checkOut
   - input: guests (placeholder: "Number of guests", value: "2")
   - chips: hotelType (options: ["Budget", "Mid-range", "Luxury", "Boutique", "Resort"])
   - slider: maxPrice (min: 50, max: 1000, value: 200)
   - button: "Search Hotels" (action: { type: "event", name: "search_hotels" })

7. PRODUCT RECOMMENDATIONS: When user asks for travel products, gear, or recommendations:
   Return type: "cards"
   Include card widgets with:
   - title: Product name
   - description: Why it's useful
   - imageUrl: Product image
   - actions: [{ type: "event", name: "view_product", payload: { productId } }]

8. SAFETY GUIDANCE: When user asks about safety, travel warnings, or security:
   Return type: "form" or "checklist"
   Include widgets:
   - checklist: safetyTips (items like "Check travel advisories", "Register with embassy", "Get travel insurance", "Share itinerary")
   - cards: safetyResources (embassy contacts, emergency numbers, travel insurance options)
   - button: "Get Safety Alerts" (action: { type: "event", name: "get_safety_alerts" })

9. WEATHER ALERTS: When user asks about weather, forecast, or climate:
   Return type: "form" or "cards"
   Include widgets:
   - input: destination (placeholder: "City or destination")
   - datepicker: date (for specific date forecast)
   - button: "Get Weather" (action: { type: "event", name: "get_weather" })
   - OR cards with weather information (temperature, conditions, forecast)

9. PRODUCT RECOMMENDATIONS: When user asks "where to buy", "recommend products", or lists products:
   Return type: "cards"
   Include card widgets with:
   - title: Product name
   - subtitle: Brief description or category
   - description: Optional detailed description
   - actions: [{ label: "Purchase", url: "https://...", action: "open_url" }]
   
   Example:
   {
     "text": "Here are some great options for travel insurance:",
     "ui": {
       "type": "cards",
       "title": "Recommended Items",
       "cards": [
         {
           "title": "Allianz Travel Insurance",
           "subtitle": "Coverage for medical + cancellation",
           "actions": [{ "label": "Purchase", "url": "https://example.com/allianz", "action": "open_url" }]
         },
         {
           "title": "Mini First Aid Kit",
           "subtitle": "Compact travel kit",
           "actions": [{ "label": "Purchase", "url": "https://example.com/firstaid", "action": "open_url" }]
         }
       ]
     }
   }
   
   IMPORTANT: Always include purchase URLs in the actions array, not in the text. Keep text concise.

10. DEAL RECOMMENDATIONS: When user asks for deals, discounts, or offers:
   Return type: "cards"
   Include card widgets with flight/hotel/product deals

11. SUMMARY/INSIGHTS: When user asks to summarize or "why this matters":
    Return type: "form"
    Include button widget: "Why this matters" (action: { type: "event", name: "show_summary" })

EXAMPLES:

User: "Plan a trip to Japan"
Response:
{
  "text": "I'll help you plan your trip to Japan! Tell me about your group:",
  "ui": {
    "id": "trip_profile_japan",
    "type": "trip_profile",
    "title": "Trip Profile",
    "state": {},
    "widgets": [
      { "kind": "input", "id": "destination", "label": "Destination", "value": "Japan", "placeholder": "Where are you going?" },
      { "kind": "number", "id": "peopleCount", "label": "Number of travelers", "min": 1, "max": 20, "value": 2 },
      { "kind": "select", "id": "audienceType", "label": "Travel group", "options": ["adults", "family"], "value": "adults" },
      { "kind": "select", "id": "ageRange", "label": "Age range", "options": ["18-25", "26-35", "36-50", "51+"], "value": "26-35" },
      { "kind": "chips", "id": "interests", "label": "Interests", "options": ["Culture", "Food", "Nature", "Adventure", "Shopping", "History", "Beach", "Nightlife"] },
      { "kind": "button", "id": "save", "label": "Save & Generate Itinerary", "action": { "type": "event", "name": "save_trip_profile" } }
    ]
  }
}

User: "Show me flight deals to Bali"
Response:
{
  "text": "Here are some great flight deals to Bali:",
  "ui": {
    "id": "flight_cards_bali",
    "type": "cards",
    "title": "Flight Deals to Bali",
    "cards": [
      { "title": "Direct Flight - $650", "subtitle": "Round trip from major cities", "actions": [{ "label": "Book", "url": "https://..." }] },
      { "title": "Budget Option - $450", "subtitle": "One stop, great value", "actions": [{ "label": "Book", "url": "https://..." }] }
    ]
  }
}

User: "Where can I buy travel insurance?"
Response:
{
  "text": "Here are some recommended travel insurance options:",
  "ui": {
    "type": "cards",
    "title": "Recommended Items",
    "cards": [
      {
        "title": "Allianz Travel Insurance",
        "subtitle": "Coverage for medical + cancellation",
        "actions": [{ "label": "Purchase", "url": "https://www.allianztravelinsurance.com", "action": "open_url" }]
      },
      {
        "title": "World Nomads Travel Insurance",
        "subtitle": "Adventure travel coverage",
        "actions": [{ "label": "Purchase", "url": "https://www.worldnomads.com", "action": "open_url" }]
      }
    ]
  }
}

User: "What should I pack for a beach trip to Thailand?"
Response:
{
  "text": "Here's a packing checklist for your beach trip to Thailand:",
  "ui": {
    "id": "packing_thailand",
    "type": "checklist",
    "title": "Packing List for Thailand",
    "state": {},
    "widgets": [
      {
        "kind": "checklist",
        "id": "packing_checklist",
        "label": "Travel Essentials",
        "items": [
          { "id": "passport", "label": "Passport & ID", "checked": false },
          { "id": "swimsuit", "label": "Swimsuit", "checked": false },
          { "id": "sunscreen", "label": "Sunscreen (SPF 50+)", "checked": false },
          { "id": "sunglasses", "label": "Sunglasses", "checked": false }
        ]
      },
      {
        "kind": "button",
        "id": "save_checklist",
        "label": "Save Checklist",
        "action": { "type": "event", "name": "save_packing_list" }
      }
    ]
  }
}

User: "Help me plan my budget for a 7-day trip to Japan"
Response:
{
  "text": "I'll help you plan your budget! Let's break it down:",
  "ui": {
    "id": "budget_planner_japan",
    "type": "form",
    "title": "Budget Planner for Japan",
    "state": {},
    "widgets": [
      { "kind": "input", "id": "destination", "label": "Destination", "value": "Japan", "placeholder": "Enter destination" },
      { "kind": "input", "id": "duration", "label": "Duration (days)", "value": "7", "placeholder": "Number of days" },
      { "kind": "slider", "id": "totalBudget", "label": "Total Budget (USD)", "min": 1000, "max": 20000, "value": 5000 },
      { "kind": "chips", "id": "budgetCategories", "label": "Budget Categories", "options": ["Flights", "Hotels", "Food", "Activities", "Transport", "Shopping"] },
      { "kind": "button", "id": "calculate", "label": "Calculate Budget", "action": { "type": "event", "name": "calculate_budget" } }
    ]
  }
}

User: "What's the weather like in Paris next week?"
Response:
{
  "text": "Let me check the weather forecast for Paris:",
  "ui": {
    "id": "weather_paris",
    "type": "form",
    "title": "Weather Forecast",
    "state": {},
    "widgets": [
      { "kind": "input", "id": "destination", "label": "Destination", "value": "Paris", "placeholder": "Enter city" },
      { "kind": "datepicker", "id": "date", "label": "Date", "mode": "single" },
      { "kind": "button", "id": "get_weather", "label": "Get Weather", "action": { "type": "event", "name": "get_weather" } }
    ]
  }
}

User: "Is it safe to travel to [destination]?"
Response:
{
  "text": "Here's a safety checklist and guidance for your trip:",
  "ui": {
    "id": "safety_guidance",
    "type": "checklist",
    "title": "Safety Checklist",
    "state": {},
    "widgets": [
      {
        "kind": "checklist",
        "id": "safety_checklist",
        "label": "Safety Essentials",
        "items": [
          { "id": "advisory", "label": "Check travel advisories", "checked": false },
          { "id": "embassy", "label": "Register with embassy", "checked": false },
          { "id": "insurance", "label": "Get travel insurance", "checked": false }
        ]
      },
      {
        "kind": "button",
        "id": "get_alerts",
        "label": "Get Safety Alerts",
        "action": { "type": "event", "name": "get_safety_alerts" }
      }
    ]
  }
}

DYNAMIC LAYOUT GENERATION:

You can create complex nested layouts by combining layout widgets:
- Use "section" to group related widgets
- Use "row" for horizontal layouts (side-by-side widgets)
- Use "column" for vertical layouts (stacked widgets)
- Use "grid" for responsive grid layouts
- Nest layout widgets inside each other for complex structures

Example: Multi-section form with nested layouts
{
  "text": "Fill out this form:",
  "ui": {
    "id": "complex_form",
    "type": "layout",
    "title": "Registration Form",
    "widgets": [
      {
        "kind": "section",
        "id": "personal_info",
        "title": "Personal Information",
        "children": [
          {
            "kind": "row",
            "id": "name_row",
            "children": [
              { "kind": "input", "id": "firstName", "label": "First Name" },
              { "kind": "input", "id": "lastName", "label": "Last Name" }
            ]
          },
          { "kind": "input", "id": "email", "label": "Email", "type": "email" }
        ]
      },
      {
        "kind": "section",
        "id": "travel_prefs",
        "title": "Travel Preferences",
        "children": [
          { "kind": "chips", "id": "interests", "label": "Interests", "options": ["Beach", "Mountain", "City"] },
          { "kind": "slider", "id": "budget", "label": "Budget", "min": 500, "max": 10000, "value": 3000 }
        ]
      },
      {
        "kind": "button",
        "id": "submit",
        "label": "Submit",
        "action": { "type": "event", "name": "submit_form" }
      }
    ]
  }
}

AUTONOMOUS UI GENERATION:

You have full autonomy to generate any UI structure that helps the user. Think creatively:
- Shopping checkout flows
- Multi-step wizards
- Interactive dashboards
- Comparison tables
- Booking flows
- Custom forms for any purpose

Always prioritize user experience and make UIs intuitive and functional.

If the user's request doesn't match any of these scenarios, return only text (no ui field).

CRITICAL RULES FOR UI MODE:
1. When UI mode is active (triggered by keywords or header), you MUST return JSON with a "ui" field.
2. The "ui" field MUST follow the exact schema above.
3. Return ONLY valid JSON - no markdown code blocks, no explanations, no text outside JSON.
4. If you cannot generate valid JSON, return: { "text": "Your response here", "ui": null }
5. The JSON must be parseable by JSON.parse() without errors.

PURCHASE HANDLING:
- NEVER confirm that a purchase has been processed or that an order has been placed.
- NEVER say "Your purchase has been processed" or "Your order has been placed" or similar fake confirmations.
- When a user says "proceed with purchase", "buy", "purchase", "checkout", or "order", the system will handle checkout automatically.
- Instead, provide helpful information about the product and let the checkout system handle the actual purchase flow.

UI MODE TRIGGERS:
- Keywords: plan, itinerary, book, flights, hotels, checklist, budget, sim, packing, esim, travel plan, trip planner
- When these keywords are detected, you MUST return UI widgets in the response.

REQUIRED RESPONSE FORMAT (when UI mode is active):
{
  "text": "short human summary",
  "ui": {
    "type": "cards",
    "cards": [
      {
        "title": "...",
        "subtitle": "...",
        "items": ["..."],
        "actions": [
          { "label": "Select", "action": "select_option", "value": "..." }
        ]
      }
    ]
  }
}

OR use the UiSpec format with widgets array as shown in examples above.

CRITICAL: Always return valid JSON. Do not include markdown code blocks. If you cannot generate valid JSON, return only text without the ui field.`;

/**
 * Detect if UI mode should be activated based on keywords or header
 */
export function shouldActivateUIMode(message: string, uiModeHeader?: string): boolean {
  // Check header first
  if (uiModeHeader === '1' || uiModeHeader === 'true') {
    return true;
  }
  
  // Check keywords
  const lowerMessage = message.toLowerCase().trim();
  const uiKeywords = [
    'plan', 'itinerary', 'book', 'flights', 'hotels', 'checklist', 
    'budget', 'sim', 'packing', 'esim', 'travel plan', 'trip planner',
    'packing list', 'flight search', 'hotel search', 'budget planner'
  ];
  
  return uiKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Generate AI response with optional UI widgets
 */
export async function generateChatResponse(
  userMessage: string,
  recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [],
  uiMode: boolean = false,
  tripState?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    travelStyle?: string[];
  }
): Promise<ChatResponse> {
  // Build system prompt - enhance if UI mode is active
  let systemPrompt = SYSTEM_PROMPT;
  if (uiMode) {
    systemPrompt += `\n\n⚠️ UI MODE IS ACTIVE ⚠️\nYou MUST return JSON with a "ui" field. Do not return plain text only. The response MUST include structured UI widgets.`;
  }
  
  // Add trip state context if available
  if (tripState) {
    const tripContext = [];
    if (tripState.destination) tripContext.push(`Destination: ${tripState.destination}`);
    if (tripState.startDate) tripContext.push(`Start Date: ${tripState.startDate}`);
    if (tripState.endDate) tripContext.push(`End Date: ${tripState.endDate}`);
    if (tripState.budget) tripContext.push(`Budget: $${tripState.budget}`);
    if (tripState.travelStyle && tripState.travelStyle.length > 0) {
      tripContext.push(`Travel Style: ${tripState.travelStyle.join(', ')}`);
    }
    
    if (tripContext.length > 0) {
      systemPrompt += `\n\n📋 CURRENT TRIP CONTEXT:\n${tripContext.join('\n')}\n\nUse this context when providing recommendations and planning assistance.`;
    }
  }

  // Build messages for Zhipu AI
  const messages: ZhipuMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ];

  // Add recent messages for context
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role,
      content: msg.text,
    });
  }

  // Add the current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  // Call Zhipu AI
  console.log('[Chat Respond] Calling Zhipu AI...', {
    messageCount: messages.length,
    userMessageLength: userMessage.length,
    uiMode,
  });

  const aiResponse = await callZhipuAI(messages);

  console.log('[Chat Respond] AI response received:', {
    responseLength: aiResponse.length,
    preview: aiResponse.substring(0, 200),
    uiMode,
  });

  // Try to parse JSON from AI response
  try {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonString = aiResponse.trim();
    
    // Remove markdown code blocks if present
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to find JSON object in the response if it's mixed with text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Validate with Zod schema
    const validated = ChatResponseSchema.parse(parsed);

    console.log('[Chat Respond] ✅ Valid JSON response:', {
      hasUI: !!validated.ui,
      uiType: validated.ui?.type,
      uiMode,
      textLength: validated.text?.length || 0,
    });

    // Post-process: If response has text but no UI, and text contains URLs, extract them
    if (validated.text && !validated.ui) {
      const lowerMessage = userMessage.toLowerCase();
      const isProductQuery = 
        lowerMessage.includes('where to buy') ||
        lowerMessage.includes('recommend') ||
        lowerMessage.includes('purchase') ||
        lowerMessage.includes('buy');
      
      if (isProductQuery) {
        // Try to extract product cards
        const productCards = extractProductRecommendations(validated.text);
        
        if (productCards.length > 0) {
          console.log('[Chat Respond] ✅ Post-processing: Extracted product cards from validated response');
          
          // Convert product URLs to Crossmint checkout links if available
          const cardsWithCheckout = await Promise.all(
            productCards.map(async (card, idx) => {
              // Check if any action has a product URL that should be converted to checkout
              const updatedActions = await Promise.all(
                (card.actions || []).map(async (action) => {
                  // If this is a purchase action with a URL, try to create Crossmint checkout
                  if (action.action === 'open_url' && action.url && action.label?.toLowerCase().includes('purchase')) {
                    try {
                      const { createCheckoutLink } = await import('../services/crossmint.js');
                      const checkoutLink = await createCheckoutLink({
                        productUrl: action.url,
                        quantity: 1,
                        currency: 'USD',
                      });
                      return {
                        ...action,
                        url: checkoutLink.checkoutUrl,
                        label: 'Purchase',
                        action: 'open_url',
                      };
                    } catch (error) {
                      // If Crossmint fails, keep original URL
                      console.warn('[Chat Respond] Failed to create Crossmint checkout, using original URL:', error);
                      return action;
                    }
                  }
                  return action;
                })
              );

              return {
                id: card.title.toLowerCase().replace(/\s+/g, '-') || `card-${idx}`,
                title: card.title,
                subtitle: card.subtitle,
                description: card.description,
                actions: updatedActions.map(action => ({
                  label: action.label || 'Purchase',
                  action: action.action || 'open_url',
                  value: action.url, // Store URL in value field for open_url actions
                  url: action.url, // Also include url for direct access
                })),
              };
            })
          );
          
          const cleanedText = cleanPurchaseLinks(validated.text);
          
          return {
            text: cleanedText || validated.text,
            ui: {
              type: 'cards',
              cards: cardsWithCheckout,
            },
          };
        }
      }
      
      // Extract URLs even if not a product query
      const urls = extractUrls(validated.text);
      if (urls.length > 0) {
        console.log('[Chat Respond] ✅ Post-processing: Extracted URLs from validated response');
        
        let cleanedText = validated.text;
        for (const link of urls) {
          cleanedText = cleanedText.replace(link.url, '').trim();
        }
        cleanedText = cleanPurchaseLinks(cleanedText);
        
        return {
          text: cleanedText || validated.text,
          ui: {
            type: 'panel',
            title: 'Links',
            actions: urls.map(link => ({
              label: link.label || 'Open Link',
              url: link.url,
              action: 'open_url',
            })),
          },
        };
      }
    }

    // If UI mode was active but no UI was returned, log warning
    if (uiMode && !validated.ui) {
      console.warn('[Chat Respond] ⚠️ UI mode was active but AI did not return UI widgets');
    }

    return validated;
  } catch (error) {
    // If JSON parsing fails, try to extract URLs and create UI widgets
    console.warn('[Chat Respond] ❌ Failed to parse JSON, attempting to extract URLs and create UI:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      uiMode,
      responsePreview: aiResponse.substring(0, 300),
    });
    
    // Check if this is a product recommendation query
    const lowerMessage = userMessage.toLowerCase();
    const isProductQuery = 
      lowerMessage.includes('where to buy') ||
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('purchase') ||
      lowerMessage.includes('buy') ||
      lowerMessage.includes('product');
    
    // Extract product cards from text
    const productCards = extractProductRecommendations(aiResponse);
    
    // If we found product cards, create UI
    if (productCards.length > 0) {
      console.log('[Chat Respond] ✅ Extracted product cards from text:', productCards.length);
      
      // Convert product URLs to Crossmint checkout links if available
      const cardsWithCheckout = await Promise.all(
        productCards.map(async (card, idx) => {
          // Check if any action has a product URL that should be converted to checkout
          const updatedActions = await Promise.all(
            (card.actions || []).map(async (action) => {
              // If this is a purchase action with a URL, try to create Crossmint checkout
              if (action.action === 'open_url' && action.url && action.label?.toLowerCase().includes('purchase')) {
                try {
                  const { createCheckoutLink } = await import('../services/crossmint.js');
                  const checkoutLink = await createCheckoutLink({
                    productUrl: action.url,
                    quantity: 1,
                    currency: 'USD',
                  });
                  return {
                    ...action,
                    url: checkoutLink.checkoutUrl,
                    label: 'Purchase',
                    action: 'open_url',
                  };
                } catch (error) {
                  // If Crossmint fails, keep original URL
                  console.warn('[Chat Respond] Failed to create Crossmint checkout, using original URL:', error);
                  return action;
                }
              }
              return action;
            })
          );

          return {
            id: card.title.toLowerCase().replace(/\s+/g, '-') || `card-${idx}`,
            title: card.title,
            subtitle: card.subtitle,
            description: card.description,
            actions: updatedActions.map(action => ({
              label: action.label || 'Purchase',
              action: action.action || 'open_url',
              value: action.url, // Store URL in value field for open_url actions
              url: action.url, // Also include url for direct access
            })),
          };
        })
      );
      
      // Clean text by removing Purchase Link lines
      const cleanedText = cleanPurchaseLinks(aiResponse);
      
      return {
        text: cleanedText || 'Here are some recommended options:',
        ui: {
          type: 'cards',
          cards: cardsWithCheckout,
        },
      };
    }
    
    // Extract URLs from text
    const urls = extractUrls(aiResponse);
    
    if (urls.length > 0) {
      console.log('[Chat Respond] ✅ Extracted URLs from text:', urls.length);
      
      // Clean text by removing URLs
      let cleanedText = aiResponse;
      for (const link of urls) {
        cleanedText = cleanedText.replace(link.url, '').trim();
      }
      cleanedText = cleanPurchaseLinks(cleanedText);
      
      // Create UI with action buttons
      return {
        text: cleanedText || 'Here are some links:',
        ui: {
          type: 'panel',
          title: 'Links',
          actions: urls.map(link => ({
            label: link.label || 'Open Link',
            url: link.url,
            action: 'open_url',
          })),
        },
      };
    }
    
    // If UI mode was active, log this as an error
    if (uiMode) {
      console.error('[Chat Respond] ⚠️ UI mode was active but JSON parsing failed and no URLs found - returning text-only response');
    }
    
    return {
      text: aiResponse,
      ui: null, // Explicitly set to null when parsing fails
    };
  }
}

/**
 * Detect intent from user message to determine if UI should be returned
 */
export function detectIntent(message: string): {
  intent: 'trip_plan' | 'flight_search' | 'product_list' | 'weather' | 'summary' | 'text';
  confidence: number;
} {
  const lowerMessage = message.toLowerCase().trim();

  // Trip planning keywords
  const tripPlanKeywords = [
    'plan', 'itinerary', 'trip plan', 'travel plan', 'schedule',
    'planner', 'planning', 'itineraries', 'day by day',
  ];
  const hasTripPlan = tripPlanKeywords.some(kw => lowerMessage.includes(kw));

  // Flight search keywords
  const flightKeywords = [
    'flight', 'flights', 'book flight', 'find flight', 'search flight',
    'airline', 'airfare', 'ticket', 'fly', 'flying',
  ];
  const hasFlight = flightKeywords.some(kw => lowerMessage.includes(kw));

  // Product/deal keywords
  const productKeywords = [
    'product', 'products', 'deal', 'deals', 'recommend', 'recommendation',
    'show me', 'find me', 'what are', 'best', 'top',
  ];
  const hasProduct = productKeywords.some(kw => lowerMessage.includes(kw));

  // Weather keywords
  const weatherKeywords = [
    'weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny',
  ];
  const hasWeather = weatherKeywords.some(kw => lowerMessage.includes(kw));

  // Summary keywords
  const summaryKeywords = [
    'summarize', 'summary', 'why this matters', 'explain', 'what does this mean',
  ];
  const hasSummary = summaryKeywords.some(kw => lowerMessage.includes(kw));

  // Determine intent with confidence
  if (hasTripPlan && !hasFlight) {
    return { intent: 'trip_plan', confidence: 0.9 };
  }
  if (hasFlight) {
    return { intent: 'flight_search', confidence: 0.9 };
  }
  if (hasProduct) {
    return { intent: 'product_list', confidence: 0.7 };
  }
  if (hasWeather) {
    return { intent: 'weather', confidence: 0.8 };
  }
  if (hasSummary) {
    return { intent: 'summary', confidence: 0.7 };
  }

  return { intent: 'text', confidence: 0.5 };
}

