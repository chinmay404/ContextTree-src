# LLM API Integration Status

## Current Configuration

✅ **LLM API URL**: `http://127.0.0.1:8000/chat/`
- Environment Variable: `NEXT_PUBLIC_LLM_API_URL`
- Currently pointing to local server on port 8000

## Integration Points

### 1. Chat Panel Component (`components/chat-panel.tsx`)
- **Primary LLM Integration**: The main chat interface makes API calls to the configured LLM endpoint
- **API Call Flow**:
  1. User sends message in chat panel
  2. Message is saved to database via `/api/canvases/{canvasId}/nodes/{nodeId}/messages`
  3. LLM API is called with payload:
     ```json
     {
       "canvasId": "canvas_id",
       "nodeId": "node_id", 
       "model": "selected_model",
       "message": "user_message"
     }
     ```
  4. LLM response is displayed and saved to database

### 2. Model Selection
- **Available Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, Claude 3 variants, Gemini Pro
- **Current Selection**: GPT-4 (default)
- Models are sent as part of the API payload to the LLM service

### 3. Error Handling & Fallback
- **URL Validation**: Checks if `NEXT_PUBLIC_LLM_API_URL` is configured
- **Network Error Handling**: Graceful fallback with user-friendly error messages
- **Toast Notifications**: Users see clear error messages when LLM service is unavailable
- **Fallback Response**: Shows helpful message when API is not configured

### 4. Visual Status Indicator
- **Connection Status**: Green dot = LLM API configured, Red dot = Not configured
- **Real-time Status**: Shows "Connected" or "Not configured" in chat panel
- **Location**: Next to model selection dropdown

## API Expected Response Format

The LLM service should respond with JSON containing either:
```json
{
  "message": "LLM response text"
}
```
or
```json
{
  "response": "LLM response text"
}
```

## Setup Instructions

1. **Start your LLM service** on `http://127.0.0.1:8000/chat/`
2. **Or update the URL** in `.env`:
   ```bash
   NEXT_PUBLIC_LLM_API_URL=https://your-llm-service.com/api/chat
   ```
3. **Restart the Next.js development server** to load new environment variables

## Testing the Integration

1. Open the app and navigate to a conversation
2. Check the status indicator in the chat panel (should be green if configured)
3. Send a message to test the LLM API call
4. Check browser console for API call logs and any errors

## Notes

- The integration is client-side (browser makes direct calls to LLM service)
- CORS must be properly configured on your LLM service
- All conversation data is also saved to the PostgreSQL database
- The system gracefully degrades when LLM service is unavailable
