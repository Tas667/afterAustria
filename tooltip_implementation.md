# Tooltip Implementation Documentation

## Overview
This document details the implementation of the dynamic tooltip system in the CLIL Activity Generator application. The system provides contextual help and information to users, enhancing UI intuitiveness without cluttering the interface.

## Features
- **Non-intrusive Design**: Small, dynamically generated SVG information icons.
- **Context-sensitive Help**: Tooltips provide relevant information based on their location and content.
- **Rich Content**: Supports HTML content within tooltips, including lists and formatted text.
- **Dynamic Positioning**: JavaScript calculates optimal tooltip position (top, bottom, left, right) relative to the trigger.
- **Viewport Boundary Awareness**: Tooltips adjust their position to stay within viewport boundaries, preventing them from appearing off-screen.
- **Clipping Prevention**: Tooltip content is appended to `document.body` to ensure it renders above all other elements and is not clipped by parent containers.
- **Single Active Tooltip**: Only one tooltip is visible at a time, managed by the `activeTooltipContent` global variable.
- **Arrow Indicator**: A CSS-styled arrow connects the tooltip box to its trigger icon, with dynamic vertical alignment for left/right positioned tooltips via the `--arrow-top-offset` CSS custom property.
- **Visual Feedback**:
    - Icons pulse with a "fresh orange" animation to draw attention.
    - Pulse stops and icon style changes (neutral gray, transparent background, light border) once its tooltip has been viewed (tracked via `data-tooltip-shown` attribute).
- **Duplicate Prevention**: System checks if a target element already has a tooltip trigger before creating a new one.
- **Consistent Styling**: Unified appearance across the application, with a `wide-tooltip` class for tooltips requiring more width.

## Implementation Details

### HTML Structure
Tooltip trigger icons are dynamically created as `<span>` elements with an SVG inside. The tooltip content box is a separate `<span>` appended to `document.body`.

**Trigger Icon (Dynamically Injected):**
```html
<span class="info-tooltip-trigger" style="display: inline-flex; vertical-align: middle; margin-left: 2px; cursor: help;" data-tooltip-shown="false">
  <svg viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"></path>
  </svg>
</span>
```

**Tooltip Content Box (Dynamically Created and Appended to Body):**
```html
<span class="tooltip-content orient-top" style="position: absolute; z-index: 20000; visibility: visible; opacity: 1; top: Ypx; left: Xpx; --arrow-top-offset: Zpx;">
  Tooltip text with <strong>HTML</strong> and <ul><li>lists</li></ul>
</span>
```

### CSS Implementation (`static/css/style.css`)
- **`.info-tooltip-trigger`**: Styles the SVG icon, including initial orange color, border, pulsing animation (`tooltip-pulse-animation`), and transition effects.
    - `[data-tooltip-shown="true"]` selector: Stops animation and changes icon to a viewed state (gray, transparent background).
- **`.tooltip-content`**: Styles the tooltip box (background, padding, shadow, border-radius, max-width).
    - Orientation classes (`.orient-top`, `.orient-bottom`, `.orient-left`, `.orient-right`) for arrow positioning.
    - `::before` and `::after` pseudo-elements: Create the connecting arrow, using `border-color` for the fill and border effect.
    - `--arrow-top-offset`: CSS custom property used by `orient-left` and `orient-right` arrows for precise vertical alignment.
- **`.wide-tooltip`**: Class to increase `max-width` for tooltips needing more space.
- Styling for HTML elements (`ul`, `li`, `strong`) within `.tooltip-content` for proper rendering.

### JavaScript Implementation (`static/js/script.js`)
- **`createTooltip(targetElement, tooltipText, position = 'top', isWide = false)`**:
    - Dynamically creates the `info-tooltip-trigger` span with an SVG icon and appends it to `targetElement`.
    - Handles `mouseenter` and `mouseleave` events on the trigger to show/hide the tooltip.
    - **`showTooltip()` (inner function)**:
        - Manages `activeTooltipContent` to ensure only one tooltip is shown.
        - Creates the `tooltip-content` span, sets its `innerHTML` with `tooltipText` (allowing HTML).
        - Appends the content box to `document.body`.
        - Calculates tooltip position based on `triggerRect` and `contentRect`.
        - Implements viewport boundary checks: converts initial document-absolute positions to viewport-relative, adjusts if out of bounds (including flipping orientation if necessary), then converts back to document-absolute for styling.
        - Sets `triggerElement.dataset.tooltipShown = 'true'`.
        - Calculates and sets the `--arrow-top-offset` CSS custom property for left/right tooltips based on final viewport-relative positions.
    - **`removeTooltipContent()` (inner function)**: Hides and removes the tooltip content from the DOM.
- **`initializeTooltips()`**:
    - Called on `DOMContentLoaded`.
    - Calls `createTooltip` for various static and dynamically-aware elements across the application, including:
        - CLIL Teaching Assistant (chatbot) card header.
        - "Generate Activity" card header.
        - `.prompt-modifiers` div (theme explanations).
        - Headers of the five main content pillars (Content Objectives, Language Objectives, etc.).
        - Sliders in the chat settings panel.
        - Helper card headers (dynamically added).
        - Insight card headers (dynamically added).
- **`updateSectionDisplay(section)`**:
    - Manages the creation/removal of tooltips for version counters in section navigation bars, showing only if `versions.length > 1`.

## Challenges Addressed & Key Decisions
- **Dynamic Content and Z-index**: Appending tooltip content to `document.body` with a high `z-index` resolved issues with clipping by parent containers and ensured tooltips always appear on top.
- **Arrow Alignment for Wide/Offset Tooltips**: Calculating `arrowTopOffsetVariable` in JavaScript and passing it as a CSS custom property (`--arrow-top-offset`) allowed precise arrow alignment, especially for tooltips positioned to the left or right of their trigger when the tooltip body itself might be shifted due to viewport constraints.
- **HTML in Tooltips**: Using `innerHTML` to set tooltip content and adding specific CSS for `ul`, `li`, `strong` within `.tooltip-content` enabled rich text formatting.
- **Viewport Collision**: Refined logic in `showTooltip` to consistently use viewport-relative coordinates for boundary checks and then convert back to document-absolute for final positioning. This improved reliability, especially with page scrolling and dynamic element resizing.
- **User Feedback on Viewed Tooltips**: The pulsing animation stops and icon styling changes upon the first view, providing clear feedback to the user and reducing persistent animation distraction.

## Usage

### Adding Tooltips Programmatically
```javascript
// Target the parent element where the 'i' icon should appear
const parentElement = document.querySelector('.some-element-to-attach-icon-to');

// Tooltip text can include HTML
const text = "This is <strong>important</strong> information.<ul><li>Point 1</li><li>Point 2</li></ul>";

// Create the tooltip (icon will be appended to parentElement)
// Tooltip content will be appended to document.body
createTooltip(parentElement, text, 'bottom', true); // Position 'bottom', make it wide
```

### Position Options
- `'top'` (default): Tooltip appears above the trigger.
- `'bottom'`: Tooltip appears below the trigger.
- `'left'`: Tooltip appears to the left of the trigger.
- `'right'`: Tooltip appears to the right of the trigger.

## Future Considerations (Previously "Future Improvements")
- **Keyboard Accessibility**: Enhance for full keyboard navigation and screen reader support for tooltip content.
- **Animation Options**: Explore more sophisticated appear/disappear animations for the tooltip box.
- **Configuration System**: Potentially centralize tooltip styling or behavior options.
- **Mobile-Specific Behavior**: Further optimize tooltip interaction for touch devices (e.g., on-tap instead of on-hover, different positioning strategies). 