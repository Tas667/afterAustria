# Changelog

## [Unreleased]

### Added
- Settings Panel Enhancement
  - Added collapsible settings panel with gear icon
  - Implemented settings persistence using localStorage
  - Added smooth transition animations
  - Improved layout of input fields
  - Added close button for better UX

- Activity Types Selection
  - Added dropdown menu with various activity types (Station Rotation, Think-Pair-Share, Project Based, etc.)
  - Each activity type includes detailed descriptions and implementation guidelines
  - Search functionality for filtering activity types
  - Multiple selection support with "All" option
  - Scrollable container for better UX

- Chatbot Memory Enhancement
  - Implemented conversation history tracking
  - Added context-aware responses
  - Improved error handling for chat requests
  - Backend support for maintaining conversation context

- Natural Conversation Flow
  - Updated system prompt for more conversational interactions
  - Removed structured response requirements
  - Enhanced context gathering capabilities
  - Improved response formatting

### Modified
- Backend Updates
  - Updated `app.py` with new activity type definitions
  - Enhanced chat system prompt for better context handling
  - Improved error handling and response formatting
  - Added support for conversation history in chat endpoints

- Frontend Improvements
  - Restructured activity type selection UI
  - Enhanced chat interface with better message handling
  - Added visual feedback for user interactions
  - Improved responsive design for better usability
  - Added collapsible settings panel
  - Improved settings persistence

### Technical Details
- Model Configuration
  - Using gpt-4o-mini model for all API calls
  - Optimized response formats for better performance
  - Enhanced error handling and recovery

- Code Structure
  - Organized activity type definitions
  - Improved system prompts organization
  - Enhanced JSON response handling
  - Better type checking and validation
  - Added localStorage integration for settings

### UI/UX Improvements
- Settings Panel
  - Intuitive gear icon for access
  - Smooth open/close animations
  - Persistent settings across sessions
  - Improved input field organization

- Activity Type Selection
  - Checkbox-based selection interface
  - Search and filter functionality
  - Clear visual feedback for selected items
  - Improved scrolling and navigation

- Chat Interface
  - Better message threading
  - Improved context display
  - Enhanced error state handling
  - More intuitive user input handling

## [Future Plans]
- Enhanced activity type filtering
- Improved chat context management
- Better error recovery mechanisms
- Additional activity type templates
- Enhanced customization options
- Advanced settings configuration options 