# Inline Generation Feature Implementation Guide

## Overview

This document provides instructions for implementing a context-aware inline text generation feature that allows users to press "/" and enter a command to generate text that naturally continues from the content above the cursor position.

## Problem Statement

The current implementation sends the entire document content to the LLM without properly extracting the text before the cursor position. This results in generated content that doesn't effectively consider the local context where the user is typing.

## Solution Architecture

1. **Frontend**: Extract text before cursor position when "/" is pressed
2. **Backend**: Use the extracted text as context for the LLM
3. **LLM Prompt**: Update system prompt to focus on continuing from the text before cursor

## Implementation Steps

### 1. Frontend Changes (script.js)

Add these functions to extract text before cursor and handle the command:

```javascript
// Add this to your existing code where the "/" key is handled
modalContent.addEventListener('keydown', (e) => {
    if (isGenerating) return; // Prevent new commands while generating

    if (e.key === '/' && !commandPrompt.classList.contains('active')) {
        e.preventDefault();
        
        // Get cursor position
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        currentCommandRange = range;
        
        // Create a range from the start of the content to the cursor
        const beforeCursorRange = document.createRange();
        beforeCursorRange.selectNodeContents(modalContent);
        beforeCursorRange.setEnd(range.startContainer, range.startOffset);
        
        // Extract text before cursor (this gets plain text, ignoring HTML tags)
        const textBeforeCursor = beforeCursorRange.toString();
        
        // Log for debugging
        console.log("Text before cursor:", textBeforeCursor);
        
        // Store for later use
        commandPrompt.dataset.textBeforeCursor = textBeforeCursor;
        
        // Show command prompt
        commandPrompt.classList.add('active');
        commandInput.focus();
    }
});

// Update your existing handleCommand function
async function handleCommand(command) {
    if (!command || isGenerating) return;
    
    isGenerating = true;
    commandStatus.textContent = 'Generating...';
    commandStatus.classList.add('generating');
    
    try {
        // Get the stored text before cursor
        const textBeforeCursor = commandPrompt.dataset.textBeforeCursor || '';
        
        const response = await fetch('/generate_inline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: modalContent.innerHTML,  // Still send full content as backup
                command: command,
                position: currentCommandRange ? currentCommandRange.startOffset : -1,
                text_before_cursor: textBeforeCursor  // Send extracted text before cursor
            })
        });
        
        // Rest of your existing function remains the same
        // ...
    } catch (error) {
        console.error('Error generating content:', error);
        commandStatus.textContent = 'Error generating content';
        isGenerating = false;
    }
}
```

### 2. Backend Changes (app.py)

Update the system prompt and modify the `/generate_inline` route:

```python
# Update the system prompt for inline generation
INLINE_GENERATION_PROMPT = """You are an AI assistant helping to generate inline content in a document editor.
You will receive:
1. Text that appears before the cursor position
2. A command from the user about what to add/modify

Your task is to generate text that:
- Continues naturally from the text before the cursor
- Maintains the same style and tone
- Directly addresses the user's command
- Is concise and focused

Respond ONLY with the text to be inserted, no explanations or markdown."""

@app.route('/generate_inline', methods=['POST'])
def generate_inline():
    data = request.json
    content = data.get('content', '')  # Full HTML content (backup)
    command = data.get('command', '')
    position = data.get('position', -1)  # Still receive position as backup
    text_before_cursor = data.get('text_before_cursor', '')  # Extracted text before cursor
    
    # If we don't have text_before_cursor for some reason, log an error
    if not text_before_cursor:
        print("Warning: No text_before_cursor provided, using full content")
        # We could try to extract it from HTML here, but it's complex
        text_before_cursor = content
    
    def generate():
        try:
            # Log what we're using for debugging
            print(f"Using text before cursor: {text_before_cursor[:100]}...")
            
            prompt = f"""Text before cursor:
{text_before_cursor}

User wants to: {command}

Generate appropriate text that continues naturally from the above context."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": INLINE_GENERATION_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"Error in streaming: {str(e)}")
            yield f"Error: {str(e)}"

    return Response(generate(), mimetype='text/event-stream')
```

## Testing the Implementation

1. **Frontend Testing**:
   - Open the browser console to view debug logs
   - Place cursor in the middle of some text
   - Press "/" and enter a command
   - Verify that the console shows the correct text before cursor

2. **Backend Testing**:
   - Check server logs to verify the text_before_cursor is being received
   - Confirm the prompt being sent to the LLM contains the correct context

3. **End-to-End Testing**:
   - Test with various cursor positions
   - Test with different commands
   - Verify that generated text flows naturally from the text before cursor

## Common Issues and Troubleshooting

1. **Text extraction issues**:
   - If the text before cursor is not being extracted correctly, check the Range API implementation
   - Ensure the range is being set from the start of the content to the cursor position

2. **HTML content issues**:
   - If HTML tags are appearing in the extracted text, use `.textContent` instead of `.innerHTML`
   - Or use the Range API's `.toString()` method which automatically extracts plain text

3. **LLM response issues**:
   - If the generated text doesn't flow naturally, check the prompt format
   - Ensure the system prompt and user message are aligned in their instructions

## Advanced Considerations

1. **Handling rich text**:
   - The current implementation extracts plain text, ignoring formatting
   - For more advanced implementations, consider preserving formatting information

2. **Context length limitations**:
   - If the text before cursor is very long, consider truncating it to the last N paragraphs
   - Add a note in the prompt that the text has been truncated

3. **Command parsing**:
   - Consider implementing command parsing to handle more complex commands
   - Example: "/add conclusion about X" could be parsed to extract the topic "X"

## LLM Context Requirements

For optimal results, ensure the LLM receives:

1. **Clear instructions** in the system prompt about its role and expected output
2. **Text before cursor** as the primary context for generation
3. **User command** clearly stated and separated from the context
4. **No redundant information** that could confuse the model

## Final Notes

- This implementation focuses on extracting text before the cursor to provide local context
- The LLM will generate text that naturally continues from what the user has already written
- The system is designed to be robust, with fallbacks if the text extraction fails
- Regular testing and monitoring will help ensure the feature works as expected 