# Modal Implementation for Assistant Buttons

## Summary

Enhanced the "Set City", "Set Dates", and "Set Budget" buttons to open interactive modals instead of sending direct messages. Users can now input their preferences through user-friendly forms.

## Changes Made

### 1. Created Modal Components

#### CityModal (`apps/web/components/chat/CityModal.tsx`)
- **Input field** for city name
- **Suggestions** from a list of 40+ popular cities
- **Auto-filtering** suggestions based on input
- **Quick selection** by clicking suggestion chips
- **Keyboard accessible** (Esc to close, Enter to submit)
- **Click outside** to close

#### DatesModal (`apps/web/components/chat/DatesModal.tsx`)
- **Date range picker** with check-in and check-out dates
- **Quick select buttons**: 2 nights, 3 nights, 1 week, 2 weeks
- **Date validation**: Ensures end date is after start date
- **Visual feedback**: Shows formatted dates and duration
- **Keyboard accessible** (Esc to close)
- **Click outside** to close

#### BudgetModal (`apps/web/components/chat/BudgetModal.tsx`)
- **Currency selector** (USD, EUR, GBP, JPY, CNY, AUD, CAD, CHF)
- **Slider** for budget amount (50-1000)
- **Quick select buttons**: $100, $150, $200, $300, $500
- **Real-time display** of selected budget
- **Keyboard accessible** (Esc to close)
- **Click outside** to close

### 2. Updated ChatPageClient

**File**: `apps/web/app/(app)/chat/ChatPageClient.tsx`

- **Added modal state**: `const [activeModal, setActiveModal] = useState<'city' | 'dates' | 'budget' | null>(null);`
- **Updated handleUIEventCallback**: Handles `open_modal` events and sets the appropriate modal
- **Added modal components**: Rendered at the bottom of the component tree
- **Modal submission**: Sends formatted messages via `handleSendMessageRef.current()`

### 3. Updated Backend Actions

**File**: `apps/api/src/routes/chat.ts`

- **Changed button actions** from `send_message` to `open_modal`:
  - "Set City" → `{ type: 'open_modal', payload: { modalType: 'city' } }`
  - "Set Dates" → `{ type: 'open_modal', payload: { modalType: 'dates' } }`
  - "Set Budget" → `{ type: 'open_modal', payload: { modalType: 'budget' } }`

## Message Format

After modal submission, messages are sent in the following format:

- **City**: `City: {cityName}`
- **Dates**: `Dates: {startDate} - {endDate}` (YYYY-MM-DD format)
- **Budget**: `Budget: {symbol}{amount} per night` (e.g., "Budget: $150 per night")

## User Flow

1. **User clicks button** (e.g., "Set City")
2. **Modal opens** with appropriate form
3. **User inputs data** (or selects from suggestions/quick options)
4. **User clicks "Set" button** (or presses Enter)
5. **Modal closes** and formatted message is sent to chat
6. **AI processes** the message and updates trip state

## Accessibility Features

- **Keyboard navigation**: Esc key closes modals
- **Focus management**: Input fields are auto-focused when modals open
- **Click outside**: Clicking the backdrop closes the modal
- **ARIA labels**: Close buttons have proper aria-label attributes
- **Form validation**: Submit buttons are disabled when inputs are invalid

## Debug Logging

All modal interactions are logged with the following prefixes:

- `[UI_ACTION_CLICK]`: Button click detected
- `[UI_ACTION] Opening modal`: Modal opening
- `[MODAL] Closing {type} modal`: Modal closing
- `[MODAL] {Type} submitted`: Modal submission with data
- `[UI_ACTION_SEND_MESSAGE]`: Message being sent to chat

## Testing

### Test 1: Set City Modal
1. Ask AI: "Plan a trip"
2. Click "Set City" button
3. **Expected**: City modal opens with input and suggestions
4. Type "Tok" → **Expected**: Tokyo appears in suggestions
5. Click "Tokyo" → **Expected**: Modal closes, message "City: Tokyo" sent

### Test 2: Set Dates Modal
1. Click "Set Dates" button
2. **Expected**: Dates modal opens with date pickers
3. Click "1 week" quick select → **Expected**: Dates auto-filled
4. Click "Set Dates" → **Expected**: Modal closes, message "Dates: {start} - {end}" sent

### Test 3: Set Budget Modal
1. Click "Set Budget" button
2. **Expected**: Budget modal opens with slider and currency selector
3. Select "EUR" → **Expected**: Currency changes
4. Click "$200" quick select → **Expected**: Slider moves to 200
5. Click "Set Budget" → **Expected**: Modal closes, message "Budget: €200 per night" sent

### Test 4: Keyboard Accessibility
1. Open any modal
2. Press Esc → **Expected**: Modal closes
3. Open modal again
4. Click outside modal → **Expected**: Modal closes

## Files Created/Modified

### Created
- `apps/web/components/chat/CityModal.tsx`
- `apps/web/components/chat/DatesModal.tsx`
- `apps/web/components/chat/BudgetModal.tsx`

### Modified
- `apps/web/app/(app)/chat/ChatPageClient.tsx`
  - Added modal state
  - Added modal event handling
  - Added modal components to render tree
- `apps/api/src/routes/chat.ts`
  - Updated button actions to use `open_modal` type

## Design Consistency

All modals follow the same design pattern:
- **Background**: Semi-transparent black overlay
- **Container**: White/gp-surface background with border
- **Header**: Title and close button (X icon)
- **Form**: Input fields with labels
- **Quick actions**: Chips/buttons for common selections
- **Footer**: Cancel and Submit buttons
- **Styling**: Consistent with existing gp-* color scheme

## Future Enhancements

1. **City autocomplete**: Integrate with a city search API for better suggestions
2. **Date calendar**: Replace native date picker with a custom calendar component
3. **Budget presets**: Add more budget ranges (budget, mid-range, luxury)
4. **Validation feedback**: Show error messages for invalid inputs
5. **Animation**: Add smooth open/close animations
6. **Mobile optimization**: Improve touch targets and spacing for mobile devices

