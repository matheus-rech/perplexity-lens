let popover: HTMLElement | null = null;

// Variable to store the current detailed insight and original text
let currentDetailedInsight: string = '';
let currentSelectedText: string = '';

// Track the last popover coordinates for updating without needing selection
let lastPopoverX: number = 0;
let lastPopoverY: number = 0;

// Function to create or update the popover
function createOrUpdatePopover(text: string, x: number, y: number, explanation: string = '', isLoading: boolean = false, previousMatch: string = ''): void {
  // Save these coordinates for later updates
  lastPopoverX = x;
  lastPopoverY = y;
  
  // Store the selected text for possible follow-up questions
  currentSelectedText = text;
  
  // Store explanation if it's a detailed insight
  if (explanation && explanation.includes('detailed-insight')) {
    currentDetailedInsight = explanation;
  }
  
  console.log('Creating/updating popover:', { text, explanation, previousMatch });
  
  // If popover doesn't exist, create it
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'perplexity-popover';
    document.body.appendChild(popover);
  }

  // Style the popover
  Object.assign(popover.style, {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    backgroundColor: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: '9999',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '300px',
    transition: 'opacity 0.2s ease',
  });

  // Clear previous content
  while (popover.firstChild) {
    popover.removeChild(popover.firstChild);
  }
  
  // Create title element
  const titleDiv = document.createElement('div');
  titleDiv.style.fontWeight = 'bold';
  titleDiv.style.color = '#805AD5';
  titleDiv.style.marginBottom = '8px';
  titleDiv.textContent = 'Perplexity Lens';
  popover.appendChild(titleDiv);
  
  // Create content container
  const contentDiv = document.createElement('div');
  contentDiv.style.borderTop = '1px solid #E2E8F0';
  contentDiv.style.paddingTop = '8px';
  
  // Create message with selected text
  const message = document.createElement('p');
  message.style.margin = '0';
  message.style.color = '#4A5568';
  message.textContent = `"${text.length > 30 ? text.substring(0, 27) + '...' : text}"`;
  contentDiv.appendChild(message);
  
  // If we have a previous match that's different from the current text, show it
  if (previousMatch && previousMatch.toLowerCase() !== text.toLowerCase()) {
    const previousMatchDiv = document.createElement('div');
    previousMatchDiv.style.fontSize = '12px';
    previousMatchDiv.style.color = '#718096';
    previousMatchDiv.style.marginTop = '4px';
    previousMatchDiv.style.fontStyle = 'italic';
    previousMatchDiv.textContent = `Using previous result for "${previousMatch}"`;
    contentDiv.appendChild(previousMatchDiv);
  } else if (previousMatch && previousMatch.toLowerCase() === text.toLowerCase()) {
    // When it's an exact match
    const previousMatchDiv = document.createElement('div');
    previousMatchDiv.style.fontSize = '12px';
    previousMatchDiv.style.color = '#805AD5'; // Purple to match the title
    previousMatchDiv.style.marginTop = '4px';
    previousMatchDiv.style.fontWeight = 'bold';
    previousMatchDiv.textContent = `Previously explained`;
    contentDiv.appendChild(previousMatchDiv);
  }
  
  // Add Ask button
  const buttonContainer = document.createElement('div');
  buttonContainer.style.marginTop = '8px';
  buttonContainer.style.textAlign = 'center';
  
  const askButton = document.createElement('button');
  askButton.textContent = explanation ? 'Ask Again' : 'Find Meaning';
  askButton.style.backgroundColor = '#805AD5';
  askButton.style.color = 'white';
  askButton.style.border = 'none';
  askButton.style.borderRadius = '4px';
  askButton.style.padding = '6px 12px';
  askButton.style.fontSize = '12px';
  askButton.style.fontWeight = 'bold';
  askButton.style.cursor = 'pointer';
  askButton.style.width = '100%';
  
  // Add hover effect
  askButton.addEventListener('mouseover', () => {
    askButton.style.backgroundColor = '#6B46C1';
  });
  askButton.addEventListener('mouseout', () => {
    askButton.style.backgroundColor = '#805AD5';
  });
  
  // Add click handler for the Ask button
  askButton.addEventListener('click', (e) => {
    // Prevent event propagation to avoid the mouseup listener catching this
    e.stopPropagation();
    
    // Show loader in popover
    createOrUpdatePopover(text, x, y, '', true);
    
    // Send message to background script to query Perplexity API
    chrome.runtime.sendMessage(
      { action: 'queryPerplexity', text: text },
      // Add a callback to handle response confirmation
      (response) => {
        if (!response || response.error) {
          console.error('Error sending query to Perplexity:', response?.error);
          // Update popover to show error
          createOrUpdatePopover(text, x, y, 'Failed to contact Perplexity. Please try again.');
        }
        // If successful, we'll wait for the setPerplexityResponse message
      }
    );
  });
  
  buttonContainer.appendChild(askButton);

  // Add Detailed Insight button
  const detailedInsightButton = document.createElement('button');
  detailedInsightButton.textContent = 'Detailed Insight';
  detailedInsightButton.style.backgroundColor = '#4299E1'; // Different color from Ask button
  detailedInsightButton.style.color = 'white';
  detailedInsightButton.style.border = 'none';
  detailedInsightButton.style.borderRadius = '4px';
  detailedInsightButton.style.padding = '6px 12px';
  detailedInsightButton.style.fontSize = '12px';
  detailedInsightButton.style.fontWeight = 'bold';
  detailedInsightButton.style.cursor = 'pointer';
  detailedInsightButton.style.width = '100%';
  detailedInsightButton.style.marginTop = '8px';

  // Add hover effect
  detailedInsightButton.addEventListener('mouseover', () => {
    detailedInsightButton.style.backgroundColor = '#3182CE';
  });
  detailedInsightButton.addEventListener('mouseout', () => {
    detailedInsightButton.style.backgroundColor = '#4299E1';
  });

  // Add click handler for the Detailed Insight button
  detailedInsightButton.addEventListener('click', (e) => {
    // Prevent event propagation
    e.stopPropagation();
    
    // Show loader in popover with a different message
    const loadingDiv = popover?.querySelector('div:last-child');
    if (loadingDiv) {
      const loadingText = loadingDiv.querySelector('span');
      if (loadingText) {
        loadingText.textContent = 'Getting detailed insight';
      }
    } else {
      createOrUpdatePopover(text, x, y, '', true);
    }
    
    // Send message to background script for detailed insight
    chrome.runtime.sendMessage(
      { action: 'detailedInsight', text: text },
      (response) => {
        if (!response || response.error) {
          console.error('Error sending detailed insight request:', response?.error);
          // Update popover to show error
          createOrUpdatePopover(text, x, y, 'Failed to get detailed insight. Please try again.');
        }
        // If successful, we'll wait for the setDetailedInsight message
      }
    );
  });

  // Add Ask New Question button
  const askCustomButton = document.createElement('button');
  askCustomButton.textContent = 'Ask a New Question';
  askCustomButton.style.backgroundColor = '#6B46C1'; // Darker purple
  askCustomButton.style.color = 'white';
  askCustomButton.style.border = 'none';
  askCustomButton.style.borderRadius = '4px';
  askCustomButton.style.padding = '6px 12px';
  askCustomButton.style.fontSize = '12px';
  askCustomButton.style.fontWeight = 'bold';
  askCustomButton.style.cursor = 'pointer';
  askCustomButton.style.width = '100%';
  askCustomButton.style.marginTop = '8px';

  // Add hover effect
  askCustomButton.addEventListener('mouseover', () => {
    askCustomButton.style.backgroundColor = '#553C9A';
  });
  askCustomButton.addEventListener('mouseout', () => {
    askCustomButton.style.backgroundColor = '#6B46C1';
  });

  // Add click handler for the Ask New Question button
  askCustomButton.addEventListener('click', (e) => {
    e.stopPropagation();
    // Show custom question interface
    showCustomQuestionInterface(text, x, y);
  });

  buttonContainer.appendChild(askCustomButton);

  buttonContainer.appendChild(detailedInsightButton);
  contentDiv.appendChild(buttonContainer);
  
  // Add explanation if available
  if (explanation) {
    const explanationDiv = document.createElement('div');
    explanationDiv.style.marginTop = '8px';
    explanationDiv.style.padding = '6px';
    explanationDiv.style.backgroundColor = '#F7FAFC';
    explanationDiv.style.borderRadius = '4px';
    explanationDiv.style.fontSize = '13px';
    explanationDiv.style.maxHeight = '250px';
    explanationDiv.style.overflowY = 'auto';
    
    const explanationTitle = document.createElement('span');
    explanationTitle.style.fontWeight = 'bold';
    explanationTitle.style.color = '#4A5568';
    explanationTitle.textContent = previousMatch ? 'Previous explanation: ' : 'Perplexity says: ';
    if (previousMatch) {
      explanationTitle.style.color = '#805AD5'; // Purple for previous explanations
    }
    explanationDiv.appendChild(explanationTitle);
    
    const explanationContent = document.createElement('div');
    // More robust check for HTML content - if it contains any HTML tags
    if (explanation.trim().match(/^<[a-z][\s\S]*>/i)) {
      // Already HTML formatted
      explanationContent.innerHTML = explanation;
    } else {
      // Apply markdown formatting to plain text explanations
      explanationContent.innerHTML = formatDetailedInsight(explanation);
    }
    explanationDiv.appendChild(explanationContent);
    
    contentDiv.appendChild(explanationDiv);
  }
  else if (isLoading) {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.marginTop = '8px';
    loadingDiv.style.fontSize = '13px';
    loadingDiv.style.color = '#718096';
    loadingDiv.style.textAlign = 'center';
    
    // Add a simple loading animation
    const loadingText = document.createElement('span');
    loadingText.textContent = 'Getting explanation';
    loadingDiv.appendChild(loadingText);
    
    // Create dots animation
    const loadingDots = document.createElement('span');
    loadingDots.id = 'loading-dots';
    loadingDots.textContent = '...';
    loadingDiv.appendChild(loadingDots);
    
    // Animate the dots
    let dotCount = 0;
    const animateDots = setInterval(() => {
      if (popover && popover.style.display === 'block') {
        dotCount = (dotCount + 1) % 4;
        const dots = '.'.repeat(dotCount);
        loadingDots.textContent = dots;
      } else {
        clearInterval(animateDots);
      }
    }, 500);
    
    contentDiv.appendChild(loadingDiv);
  }
  
  popover.appendChild(contentDiv);
  
  // Make popover visible
  popover.style.display = 'block';
}

// Function to hide the popover
function hidePopover(): void {
  if (popover) {
    popover.style.display = 'none';
  }
}

// To prevent popover from closing when clicked inside
document.addEventListener('mousedown', (event) => {
  // Check if click was inside popover
  if (popover && popover.contains(event.target as Node)) {
    event.stopPropagation();
  }
});

// Listen for text selection
document.addEventListener('mouseup', (event) => {
  // Check if click was inside popover - if so, don't hide or create new popover
  if (popover && popover.contains(event.target as Node)) {
    return;
  }
  
  const selection = window.getSelection();
  
  // If there's a valid selection
  if (selection && selection.toString().trim().length > 0) {
    const selectedText = selection.toString().trim();
    
    // Get position for the popover (near the selection)
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.bottom + window.scrollY + 10; // 10px below the selection
    
    // Show the popover initially without explanation
    createOrUpdatePopover(selectedText, x, y);
    
    // Send the selected text to the extension
    chrome.runtime.sendMessage({
      action: 'setSelectedText',
      text: selectedText
    }, response => {
      // Log that we received a response
      console.log('Selection sent, has previous:', response?.hasPrevious);
      
      // If we don't get a previous explanation message within a short time,
      // then we can assume there wasn't one even if response.hasPrevious is true
      if (response?.hasPrevious) {
        // Set a short timeout to check if we got the previous explanation
        setTimeout(() => {
          // If the popover still doesn't have an explanation, show a notice
          const explanationDiv = popover?.querySelector('[style*="background-color: #F7FAFC"]');
          if (!explanationDiv && popover) {
            console.log('Previous explanation was expected but not received');
          }
        }, 300); // Just a short delay
      }
    });
  } else {
    // No selection, hide the popover if it's not inside the popover itself
    const target = event.target as Node;
    if (popover && !popover.contains(target)) {
      hidePopover();
    }
  }
});

// Function to create and add follow-up question UI
function addFollowUpQuestionUI(containerDiv: HTMLElement): void {
  const followUpContainer = document.createElement('div');
  followUpContainer.style.marginTop = '12px';
  followUpContainer.style.borderTop = '1px solid #E2E8F0';
  followUpContainer.style.paddingTop = '8px';
  
  const followUpLabel = document.createElement('p');
  followUpLabel.style.margin = '0 0 6px 0';
  followUpLabel.style.fontSize = '13px';
  followUpLabel.style.fontWeight = 'bold';
  followUpLabel.style.color = '#4A5568';
  followUpLabel.textContent = 'Ask a follow-up question:';
  followUpContainer.appendChild(followUpLabel);
  
  const followUpInput = document.createElement('input');
  followUpInput.placeholder = 'Type your question here...';
  followUpInput.style.width = '100%';
  followUpInput.style.padding = '6px 8px';
  followUpInput.style.border = '1px solid #CBD5E0';
  followUpInput.style.borderRadius = '4px';
  followUpInput.style.fontSize = '13px';
  followUpInput.style.marginBottom = '8px';
  followUpContainer.appendChild(followUpInput);
  
  const followUpButton = document.createElement('button');
  followUpButton.textContent = 'Ask';
  followUpButton.style.backgroundColor = '#38B2AC';
  followUpButton.style.color = 'white';
  followUpButton.style.border = 'none';
  followUpButton.style.borderRadius = '4px';
  followUpButton.style.padding = '6px 12px';
  followUpButton.style.fontSize = '12px';
  followUpButton.style.fontWeight = 'bold';
  followUpButton.style.cursor = 'pointer';
  followUpButton.style.width = '100%';
  
  // Add hover effect
  followUpButton.addEventListener('mouseover', () => {
    followUpButton.style.backgroundColor = '#319795';
  });
  followUpButton.addEventListener('mouseout', () => {
    followUpButton.style.backgroundColor = '#38B2AC';
  });
  
  // Add click handler
  followUpButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const question = followUpInput.value.trim();
    
    if (!question) {
      // Show validation message
      followUpInput.style.borderColor = '#E53E3E';
      setTimeout(() => {
        followUpInput.style.borderColor = '#CBD5E0';
      }, 2000);
      return;
    }
    
    // Update UI to show loading
    followUpButton.disabled = true;
    followUpButton.textContent = 'Processing...';
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'followUpQuestion',
      originalText: currentSelectedText,
      originalInsight: currentDetailedInsight.replace(/<[^>]*>/g, ''), // Strip HTML tags
      question: question
    }, (response) => {
      if (!response || response.error) {
        console.error('Error sending follow-up question:', response?.error);
        followUpButton.textContent = 'Try Again';
        followUpButton.disabled = false;
      }
    });
  });
  
  followUpContainer.appendChild(followUpButton);
  containerDiv.appendChild(followUpContainer);
}

// Function to add follow-up response to popover
function addFollowUpResponse(containerDiv: HTMLElement, response: string): void {
  // Remove any existing follow-up response
  const existingResponse = containerDiv.querySelector('.follow-up-response');
  if (existingResponse) {
    containerDiv.removeChild(existingResponse);
  }
  
  const responseDiv = document.createElement('div');
  responseDiv.className = 'follow-up-response';
  responseDiv.style.marginTop = '10px';
  responseDiv.style.padding = '8px';
  responseDiv.style.backgroundColor = '#E6FFFA';
  responseDiv.style.borderRadius = '4px';
  responseDiv.style.fontSize = '13px';
  
  const formattedResponse = formatDetailedInsight(response);
  responseDiv.innerHTML = formattedResponse;
  
  containerDiv.appendChild(responseDiv);
  
  // Reset button state if it exists
  const button = containerDiv.querySelector('button:last-of-type') as HTMLButtonElement;
  if (button && button.textContent === 'Processing...') {
    button.disabled = false;
    button.textContent = 'Ask';
  }
}

// Listen for messages from the popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Provide page text for summarisation
  if (request.action === 'getPageContent') {
    const content = document.body.innerText;
    sendResponse({ content });
    return true;
  }
  if (request.action === 'getSelectedText') {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    sendResponse({ selectedText });
  } else if (request.action === 'setPerplexityResponse') {
    // Update the popover with the explanation
    if (popover && popover.style.display === 'block') {
      const selection = window.getSelection();
      if (selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY + 10;
        
        createOrUpdatePopover(request.text, x, y, request.explanation, false);
      }
    }
    sendResponse({ success: true });
  } else if (request.action === 'setPreviousExplanation') {
    console.log('Received setPreviousExplanation message:', request);
    
    // Show the previous explanation at the last popover position
    if (!popover) {
      // Create a new popover since it doesn't exist yet
      createOrUpdatePopover(
        request.text,
        lastPopoverX || window.innerWidth / 2,  // Default to center if no coords
        lastPopoverY || window.innerHeight / 2,
        request.explanation,
        false,
        request.previousText
      );
    } else {
      // Update existing popover
      popover.style.display = 'block'; // Ensure it's visible
      createOrUpdatePopover(
        request.text,
        lastPopoverX,
        lastPopoverY,
        request.explanation,
        false,
        request.previousText
      );
    }
    sendResponse({ success: true });
  } else if (request.action === 'setDetailedInsight') {
    // Update the popover with the detailed insight
    if (popover && popover.style.display === 'block') {
      const selection = window.getSelection();
      if (selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY + 10;
        
        // Let createOrUpdatePopover handle the formatting
        createOrUpdatePopover(request.text, x, y, request.detailedInsight, false);
        
        // Add follow-up question UI to the popover
        if (popover) {
          const contentDiv = popover.querySelector('div:nth-child(2)') as HTMLElement;
          if (contentDiv) {
            addFollowUpQuestionUI(contentDiv);
          }
        }
      }
    }
    sendResponse({ success: true });
  } else if (request.action === 'setFollowUpResponse') {
    if (popover && popover.style.display === 'block') {
      const contentDiv = popover.querySelector('div:nth-child(2)') as HTMLElement;
      if (contentDiv) {
        addFollowUpResponse(contentDiv, request.followUpResponse);
      }
    }
    sendResponse({ success: true });
  } else if (request.action === 'customQuestionResponse') {
    console.log('Received custom question response');
    
    // Find any open response UI and update it
    const responseContent = document.querySelector('.custom-question-response-content') as HTMLElement;
    const loadingIndicator = document.querySelector('.custom-question-loading') as HTMLElement;
    const responseArea = document.querySelector('.custom-question-response-area') as HTMLElement;
    const submitButton = document.querySelector('.custom-question-submit') as HTMLButtonElement;
    
    if (responseContent && loadingIndicator && responseArea && submitButton) {
      // Hide loading
      loadingIndicator.style.display = 'none';
      submitButton.disabled = false;
      submitButton.textContent = 'Ask Perplexity';
      
      if (request.error) {
        // Show error
        responseContent.innerHTML = `<div style="color: #E53E3E;">Error: ${request.message || 'Failed to get a response'}</div>`;
      } else {
        // Show the response with proper markdown formatting
        responseContent.innerHTML = formatDetailedInsight(request.answer);
      }
      
      // Show the response area
      responseArea.style.display = 'block';
    }
    
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async responses
});

// Function to format the detailed insight with comprehensive Markdown parsing
function formatDetailedInsight(insight: string): string {
  if (!insight) return '';
  
  // Start with line breaks to paragraphs - do this first before other replacements
  let formatted = insight
    .replace(/\n\n+/g, '</p><p>') // Multiple newlines to paragraph breaks
    .replace(/\n/g, '<br>');      // Single newlines to <br>
  
  // Headings (H1, H2, H3)
  formatted = formatted
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  // Bold and italic
  formatted = formatted
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.+?)\*/g, '<em>$1</em>')            // *italic*
    .replace(/\_\_(.+?)\_\_/g, '<strong>$1</strong>') // __bold__
    .replace(/\_(.+?)\_/g, '<em>$1</em>');           // _italic_
  
  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Code blocks
  formatted = formatted.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
  
  // Links
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Lists - transform them into proper HTML lists
  // First detect if we have a list section
  if (formatted.match(/^(-|\*|\d+\.)\s+.+$/gm)) {
    // Handle unordered lists
    let listPattern = /((?:^(-|\*)\s+.+$(?:\n|$))+)/gm;
    formatted = formatted.replace(listPattern, function(match) {
      let listItems = match.split('\n').filter(line => line.trim().length > 0);
      return '<ul>' + 
        listItems.map(item => {
          let content = item.replace(/^(-|\*)\s+(.+)$/, '$2');
          return `<li>${content}</li>`;
        }).join('') + 
        '</ul>';
    });
    
    // Handle ordered lists
    listPattern = /((?:^\d+\.\s+.+$(?:\n|$))+)/gm;
    formatted = formatted.replace(listPattern, function(match) {
      let listItems = match.split('\n').filter(line => line.trim().length > 0);
      return '<ol>' + 
        listItems.map(item => {
          let content = item.replace(/^\d+\.\s+(.+)$/, '$1');
          return `<li>${content}</li>`;
        }).join('') + 
        '</ol>';
    });
  }
  
  // Highlight numbers, but only those not inside code blocks or HTML tags
  formatted = formatted.replace(/(?<!<code[^>]*>)(?<!<[^>]*)(\b\d+(\.\d+)?%?)\b(?![^<]*>)/g, '<b>$1</b>');
  
  // Blockquotes
  formatted = formatted.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Wrap in a div for styling and add paragraph tags around the content if it doesn't already start with a tag
  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  // Add some CSS styling for markdown elements
  const markdownStyles = `
    <style>
      .detailed-insight h1, .detailed-insight h2, .detailed-insight h3 {
        margin: 8px 0 4px 0;
        font-weight: bold;
      }
      .detailed-insight h1 { font-size: 16px; }
      .detailed-insight h2 { font-size: 15px; }
      .detailed-insight h3 { font-size: 14px; }
      .detailed-insight p { margin: 4px 0; }
      .detailed-insight ul, .detailed-insight ol { 
        padding-left: 20px;
        margin: 4px 0;
      }
      .detailed-insight li { margin: 2px 0; }
      .detailed-insight pre {
        background-color: #EDF2F7;
        padding: 6px;
        border-radius: 3px;
        overflow-x: auto;
      }
      .detailed-insight code {
        font-family: monospace;
        background-color: #EDF2F7;
        padding: 2px 4px;
        border-radius: 3px;
      }
      .detailed-insight blockquote {
        border-left: 3px solid #CBD5E0;
        padding-left: 8px;
        margin: 6px 0;
        color: #4A5568;
      }
      .detailed-insight a {
        color: #3182CE;
        text-decoration: underline;
      }
    </style>
  `;

  return `<div class="detailed-insight" style="line-height: 1.4;">${markdownStyles}${formatted}</div>`;
}

// Function to display the custom question interface
function showCustomQuestionInterface(contextText: string, x: number, y: number): void {
  // Create modal container
  const modalOverlay = document.createElement('div');
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = '0';
  modalOverlay.style.left = '0';
  modalOverlay.style.width = '100%';
  modalOverlay.style.height = '100%';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = '10000';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.padding = '20px';
  modalContent.style.borderRadius = '8px';
  modalContent.style.maxWidth = '500px';
  modalContent.style.width = '90%';
  modalContent.style.maxHeight = '80vh';
  modalContent.style.overflowY = 'auto';
  modalContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  
  // Create modal header
  const modalHeader = document.createElement('div');
  modalHeader.style.display = 'flex';
  modalHeader.style.justifyContent = 'space-between';
  modalHeader.style.alignItems = 'center';
  modalHeader.style.marginBottom = '16px';
  
  const modalTitle = document.createElement('h3');
  modalTitle.style.margin = '0';
  modalTitle.style.color = '#805AD5';
  modalTitle.style.fontSize = '18px';
  modalTitle.style.fontWeight = 'bold';
  modalTitle.textContent = 'Ask Perplexity a Question';
  
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.color = '#718096';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });
  
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  
  // Create form elements
  const form = document.createElement('div');
  
  // Context information
  const contextDiv = document.createElement('div');
  contextDiv.style.marginBottom = '12px';
  contextDiv.style.padding = '8px';
  contextDiv.style.backgroundColor = '#F7FAFC';
  contextDiv.style.borderRadius = '4px';
  contextDiv.style.fontSize = '14px';
  
  const contextLabel = document.createElement('div');
  contextLabel.style.fontWeight = 'bold';
  contextLabel.style.marginBottom = '4px';
  contextLabel.textContent = 'Context:';
  
  const contextText2 = document.createElement('div');
  contextText2.style.color = '#4A5568';
  contextText2.textContent = contextText.length > 100 
    ? `${contextText.substring(0, 97)}...` 
    : contextText;
  
  contextDiv.appendChild(contextLabel);
  contextDiv.appendChild(contextText2);
  
  // Question textarea
  const questionLabel = document.createElement('label');
  questionLabel.style.display = 'block';
  questionLabel.style.marginBottom = '6px';
  questionLabel.style.fontWeight = 'bold';
  questionLabel.style.color = '#4A5568';
  questionLabel.textContent = 'Your Question:';
  
  const questionInput = document.createElement('textarea');
  questionInput.placeholder = 'Type your question here...';
  questionInput.style.width = '100%';
  questionInput.style.padding = '8px 12px';
  questionInput.style.borderRadius = '4px';
  questionInput.style.border = '1px solid #CBD5E0';
  questionInput.style.fontSize = '14px';
  questionInput.style.minHeight = '100px';
  questionInput.style.marginBottom = '16px';
  questionInput.style.resize = 'vertical';
  questionInput.style.boxSizing = 'border-box';
  
  // Image upload section
  const imageUploadDiv = document.createElement('div');
  imageUploadDiv.style.marginBottom = '16px';
  
  const imageLabel = document.createElement('label');
  imageLabel.style.display = 'block';
  imageLabel.style.marginBottom = '6px';
  imageLabel.style.fontWeight = 'bold';
  imageLabel.style.color = '#4A5568';
  imageLabel.textContent = 'Attach Image (optional):';
  
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.style.display = 'none';
  
  // Custom file upload button
  const customFileButton = document.createElement('button');
  customFileButton.textContent = 'Choose Image';
  customFileButton.style.backgroundColor = '#EDF2F7';
  customFileButton.style.border = '1px solid #CBD5E0';
  customFileButton.style.borderRadius = '4px';
  customFileButton.style.padding = '6px 12px';
  customFileButton.style.fontSize = '14px';
  customFileButton.style.cursor = 'pointer';
  customFileButton.addEventListener('click', () => {
    imageInput.click();
  });
  
  // Image preview area
  const imagePreview = document.createElement('div');
  imagePreview.style.marginTop = '8px';
  imagePreview.style.display = 'none';
  
  const previewImage = document.createElement('img');
  previewImage.style.maxWidth = '100%';
  previewImage.style.maxHeight = '200px';
  previewImage.style.borderRadius = '4px';
  
  const removeImageButton = document.createElement('button');
  removeImageButton.textContent = 'Remove';
  removeImageButton.style.marginTop = '4px';
  removeImageButton.style.backgroundColor = '#FED7D7';
  removeImageButton.style.color = '#C53030';
  removeImageButton.style.border = 'none';
  removeImageButton.style.borderRadius = '4px';
  removeImageButton.style.padding = '4px 8px';
  removeImageButton.style.fontSize = '12px';
  removeImageButton.style.cursor = 'pointer';
  removeImageButton.addEventListener('click', () => {
    imageInput.value = '';
    imagePreview.style.display = 'none';
    selectedFile = null;
  });
  
  imagePreview.appendChild(previewImage);
  imagePreview.appendChild(removeImageButton);
  
  // Track selected file
  let selectedFile: File | null = null;
  
  // Handle file selection
  imageInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      selectedFile = files[0];
      previewImage.src = URL.createObjectURL(selectedFile);
      imagePreview.style.display = 'block';
    }
  });
  
  imageUploadDiv.appendChild(imageLabel);
  imageUploadDiv.appendChild(imageInput);
  imageUploadDiv.appendChild(customFileButton);
  imageUploadDiv.appendChild(imagePreview);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Ask Perplexity';
  submitButton.style.backgroundColor = '#805AD5';
  submitButton.style.color = 'white';
  submitButton.style.border = 'none';
  submitButton.style.borderRadius = '4px';
  submitButton.style.padding = '10px 16px';
  submitButton.style.fontSize = '16px';
  submitButton.style.fontWeight = 'bold';
  submitButton.style.cursor = 'pointer';
  submitButton.style.width = '100%';
  submitButton.className = 'custom-question-submit';
  
  // Response area (initially hidden)
  const responseArea = document.createElement('div');
  responseArea.style.marginTop = '20px';
  responseArea.style.display = 'none';
  responseArea.style.borderTop = '1px solid #E2E8F0';
  responseArea.style.paddingTop = '16px';
  responseArea.className = 'custom-question-response-area';
  
  const responseTitle = document.createElement('h4');
  responseTitle.style.margin = '0 0 12px 0';
  responseTitle.style.color = '#805AD5';
  responseTitle.style.fontSize = '16px';
  responseTitle.textContent = 'Perplexity Response:';
  
  const responseContent = document.createElement('div');
  responseContent.style.backgroundColor = '#F7FAFC';
  responseContent.style.padding = '12px';
  responseContent.style.borderRadius = '4px';
  responseContent.style.fontSize = '14px';
  responseContent.style.lineHeight = '1.5';
  responseContent.style.maxHeight = '300px';
  responseContent.style.overflowY = 'auto';
  responseContent.className = 'custom-question-response-content';
  
  const loadingIndicator = document.createElement('div');
  loadingIndicator.style.display = 'none';
  loadingIndicator.style.textAlign = 'center';
  loadingIndicator.style.padding = '20px';
  loadingIndicator.className = 'custom-question-loading';
  loadingIndicator.innerHTML = `
    <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(128, 90, 213, 0.3); border-radius: 50%; border-top-color: #805AD5; animation: spin 1s ease-in-out infinite;"></div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    <div style="margin-top: 10px; color: #805AD5;">Asking Perplexity...</div>
  `;
  
  responseArea.appendChild(responseTitle);
  responseArea.appendChild(responseContent);
  
  // Submit handler
  submitButton.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    if (!question) {
      // Highlight the textarea if empty
      questionInput.style.border = '1px solid #E53E3E';
      setTimeout(() => {
        questionInput.style.border = '1px solid #CBD5E0';
      }, 2000);
      return;
    }
    
    // Show loading
    loadingIndicator.style.display = 'block';
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    responseArea.style.display = 'none';
    
    // Prepare the data
    let imageDataUrl = '';
    if (selectedFile) {
      // Convert image to base64
      imageDataUrl = await readFileAsDataURL(selectedFile);
    }
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'customQuestion',
      question: question,
      context: contextText,
      imageData: imageDataUrl
    }, response => {
      // Hide loading
      loadingIndicator.style.display = 'none';
      submitButton.disabled = false;
      submitButton.textContent = 'Ask Perplexity';
      
      if (response && response.answer) {
        // Show the response
        responseContent.innerHTML = formatDetailedInsight(response.answer);
        responseArea.style.display = 'block';
      } else {
        // Show error
        // responseContent.innerHTML = '<div style="color: #E53E3E;">Failed to get a response. Please try again.</div>';
        // responseArea.style.display = 'block';
      }
    });
  });
  
  // Helper function to read file as data URL
  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  // Assemble the form
  form.appendChild(contextDiv);
  form.appendChild(questionLabel);
  form.appendChild(questionInput);
  form.appendChild(imageUploadDiv);
  form.appendChild(submitButton);
  
  // Assemble the modal
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(form);
  modalContent.appendChild(loadingIndicator);
  modalContent.appendChild(responseArea);
  modalOverlay.appendChild(modalContent);
  
  // Add modal to page
  document.body.appendChild(modalOverlay);
  
  // Focus the textarea
  setTimeout(() => questionInput.focus(), 100);
  
  // Close modal when clicking outside
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
}