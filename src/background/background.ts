import { PERPLEXITY_API_KEY, PERPLEXITY_API_URL } from '../config';
import authService from '../services/AuthService';
import knowledgeGraphService from '../services/KnowledgeGraphService';

// Initialize services
async function initServices() {
  const authInitialized = await authService.initialize();
  if (!authInitialized) {
    console.warn('Authentication service failed to initialize');
  } else {
    console.log('User authenticated:', authService.getUserId());
  }
  
  const graphInitialized = await knowledgeGraphService.initialize();
  if (!graphInitialized) {
    console.warn('Knowledge graph service failed to initialize');
  } else {
    console.log('Knowledge graph service initialized');
  }
}

// Call initialization when the extension starts
initServices();

// Store selected text that can be accessed when the popup opens
let selectedText: string = '';
let perplexityResponse: string = '';

// Function to query Perplexity API
async function queryPerplexity(text: string): Promise<string> {
  try {
    console.log('Making API request to:', PERPLEXITY_API_URL);
    console.log('With API key (first few chars):', PERPLEXITY_API_KEY.substring(0, 8) + '...');
    
    const payload = {
      model: 'sonar',  // Try a different model
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains concepts concisely in 20 tokens or less.'
        },
        {
          role: 'user',
          content: `Explain briefly: "${text}"`
        }
      ],
      max_tokens: 20
    };
    
    console.log('Request payload:', JSON.stringify(payload));
    
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Detailed error calling Perplexity API:', error);
    return `API error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// New function for detailed analysis with higher token limit
async function getDetailedInsight(text: string): Promise<string> {
  try {
    console.log('Making detailed insight API request to:', PERPLEXITY_API_URL);
    console.log('With API key (first few chars):', PERPLEXITY_API_KEY.substring(0, 8) + '...');
    
    const payload = {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides detailed analysis. Include relevant data, numbers, or chart descriptions if applicable.'
        },
        {
          role: 'user',
          content: `Provide a detailed insight about: "${text}"`
        }
      ],
      max_tokens: 200
    };
    
    console.log('Detailed insight request payload:', JSON.stringify(payload));
    
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log('Detailed API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Detailed API error (${response.status}):`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Detailed API response data:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Detailed error calling Perplexity API:', error);
    return `API error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Function to handle follow-up questions after a detailed insight
async function handleFollowUpQuestion(originalText: string, originalInsight: string, followUpQuestion: string): Promise<string> {
  try {
    console.log('Processing follow-up question:', followUpQuestion);
    
    const payload = {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant analyzing text. Continue the conversation based on your previous analysis.'
        },
        {
          role: 'user',
          content: `Analyze this text: "${originalText}"`
        },
        {
          role: 'assistant',
          content: originalInsight
        },
        {
          role: 'user',
          content: followUpQuestion
        }
      ],
      max_tokens: 200
    };
    
    console.log('Follow-up request payload:', JSON.stringify(payload));
    
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Follow-up API error (${response.status}):`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Follow-up API response data:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error with follow-up question:', error);
    return `API error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Function to save selected text with timestamp to storage
async function saveSelectedText(text: string, explanation: string) {
  try {
    // Get current date and URL
    const timestamp = new Date().toISOString();
    const selection = { text, explanation, timestamp };
    
    // Retrieve existing selections
    const result = await chrome.storage.local.get('selections');
    const selections = result.selections || [];
    
    // Add new selection and save back to storage
    selections.push(selection);
    await chrome.storage.local.set({ selections });
    
    // Add to knowledge graph if user is authenticated
    if (authService.isAuthenticated()) {
      try {
        await knowledgeGraphService.addSelection(text);
      } catch (error) {
        console.error('Failed to add selection to knowledge graph:', error);
      }
    }
    
    console.log('Saved selection:', selection);
    return selections;
  } catch (error) {
    console.error('Error saving selection:', error);
    return [];
  }
}

// Function to find semantically similar words (root words, variations, etc.)
function findSimilarWords(word: string): string[] {
  console.debug(`[debug] findSimilarWords called with: "${word}"`);
  // Convert to lowercase for case-insensitive matching
  const normalizedWord = word.toLowerCase().trim();
  
  // Generate common variations
  const variations: string[] = [normalizedWord];
  console.debug(`[debug] initial normalizedWord: "${normalizedWord}"`);
  
  // Handle common suffixes (simple implementation)
  if (normalizedWord.endsWith('s')) {
    // Plural -> singular
    variations.push(normalizedWord.slice(0, -1));
  } else {
    // Singular -> plural
    variations.push(`${normalizedWord}s`);
  }
  
  // Handle 'ing' form
  if (normalizedWord.endsWith('ing') && normalizedWord.length > 4) {
    // remove 'ing'
    const base = normalizedWord.slice(0, -3);
    variations.push(base);
    variations.push(`${base}e`); // handle 'e' drop (e.g., 'attracting' -> 'attract')
  } else {
    // Add 'ing' form
    if (normalizedWord.endsWith('e')) {
      // Drop the 'e' before adding 'ing'
      variations.push(`${normalizedWord.slice(0, -1)}ing`);
    } else {
      variations.push(`${normalizedWord}ing`);
    }
  }
  
  // Handle 'ed' form
  if (normalizedWord.endsWith('ed') && normalizedWord.length > 3) {
    // remove 'ed'
    const base = normalizedWord.slice(0, -2);
    variations.push(base);
    variations.push(`${base}e`); // handle 'e' drop (e.g., 'attracted' -> 'attract')
  } else {
    // Add 'ed' form
    if (normalizedWord.endsWith('e')) {
      variations.push(`${normalizedWord}d`);
    } else {
      variations.push(`${normalizedWord}ed`);
    }
  }
  
  // Handle 'ion'/'tion' endings (e.g., 'attraction' -> 'attract')
  if (normalizedWord.endsWith('ion') && normalizedWord.length > 4) {
    variations.push(normalizedWord.slice(0, -3));
    if (normalizedWord.endsWith('tion') && normalizedWord.length > 5) {
      variations.push(normalizedWord.slice(0, -4));
      variations.push(`${normalizedWord.slice(0, -4)}te`); // e.g., 'attraction' -> 'attract'
    }
  }
  console.debug(`[debug] variations before unique filter: ${variations.join(', ')}`);
  
  // Return unique variations
  const uniqueVars = [...new Set(variations)];
  console.debug(`[debug] unique variations: ${uniqueVars.join(', ')}`);
  return uniqueVars;
}

// Function to find a previous explanation for the selected text
async function findPreviousExplanation(text: string): Promise<{ text: string, explanation: string } | null> {
  console.log(`[debug] findPreviousExplanation called with: "${text}"`);
  // Explicitly use callback API and wrap in a Promise
  const result = await new Promise<{ selections?: Array<{ text: string; explanation: string; timestamp: string }> }>(resolve => {
    chrome.storage.local.get('selections', resolve);
  });
  const selections = result.selections || [];
  console.log(`[debug] loaded ${selections.length} selections from storage:`, selections);
  if (selections.length === 0) {
    console.log('[debug] no selections found, returning null');
    return null;
  }
  // Generate similar words
  const similarWords = findSimilarWords(text);
  console.log(`[debug] similarWords for "${text}":`, similarWords);

  // Search for a match and capture the stored explanation
  for (const selection of selections) {
    const stored = selection.text.toLowerCase().trim();
    if (stored === text.toLowerCase().trim()) {
      const rawExplanation = selection.explanation ?? '';
      // Strip any "Detailed Insight:" prefix to get the core insight
      const detailedInsight = rawExplanation.startsWith('Detailed Insight: ')
        ? rawExplanation.substring('Detailed Insight: '.length)
        : rawExplanation;
      console.log(`[debug] exact match for "${text}"; detailed insight="${detailedInsight}"`);
      return { text: selection.text, explanation: rawExplanation };
    }
    for (const variant of similarWords) {
      if (stored === variant) {
        const rawExplanation = selection.explanation ?? '';
        const detailedInsight = rawExplanation.startsWith('Detailed Insight: ')
          ? rawExplanation.substring('Detailed Insight: '.length)
          : rawExplanation;
        console.log(`[debug] semantic match for "${text}" via variant "${variant}"; detailed insight="${detailedInsight}"`);
        return { text: selection.text, explanation: rawExplanation };
      }
    }
  }
  console.log(`[debug] no match found for "${text}"`);
  return null;
}

// Add a new function to handle custom questions with or without images
async function handleCustomQuestion(question: string, context: string, imageData: string = ''): Promise<string> {
  try {
    console.log('Processing custom question:', question);
    
    // Determine if we're using an image or not
    const hasImage = !!imageData && imageData.length > 0;
    
    // Create system message based on whether this has context
    let systemMessage = 'You are a helpful assistant that provides detailed and comprehensive answers.';
    if (context) {
      systemMessage += ` The user is looking at content related to: "${context}". Provide insights relevant to this context when possible.`;
    }
    
    // Create the payload
    const payload: any = {
      model: 'sonar',  // Using sonar model for best results
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: []  // Will be an array for messages with images
        }
      ],
      max_tokens: 1000  // Allow for longer responses
    };
    
    // Add text content
    if (hasImage) {
      // If we have an image, format as a multi-part message
      payload.messages[1].content = [
        { type: 'text', text: question },
        { type: 'image_url', image_url: { url: imageData } }
      ];
    } else {
      // Text-only message
      payload.messages[1].content = question;
    }
    
    console.log('Custom question request payload:', JSON.stringify(payload));
    
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Custom question API error (${response.status}):`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Custom question API response:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error processing custom question:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

// Function to summarise full page content
async function getPageSummary(content: string): Promise<string> {
  try {
    console.log('Making page summary request to:', PERPLEXITY_API_URL);
    const payload = {
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes web page content concisely.' },
        { role: 'user', content: `Summarize the following web page content:
${content}` }
      ],
      max_tokens: 300
    };
    console.log('Page summary payload:', JSON.stringify(payload));
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Summary API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('Page summary response data:', data);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error getting page summary:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle summarisation requests from popup
  if (request.action === 'summarisePage') {
    const content = request.content || '';
    getPageSummary(content).then(summary => {
      sendResponse({ summary });
    }).catch(error => {
      console.error('Error generating page summary:', error);
      sendResponse({ error: error.message || 'Unknown error' });
    });
    return true; // Keep the message channel open for async response
  }
  if (request.action === 'setSelectedText' && request.text) {
    selectedText = request.text;
    console.log('Selected text:', selectedText);
    
    // Check for previous explanation
    findPreviousExplanation(selectedText).then(previousResult => {
      if (previousResult) {
        console.log(`Previous explanation for "${selectedText}":`, previousResult.explanation, `(matched stored "${previousResult.text}")`);
        
        // Send the previous explanation back to the content script
        const tabId = sender.tab?.id;
        if (tabId) {
          // First confirm the tab still exists
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              console.log('Tab no longer exists:', chrome.runtime.lastError.message);
              sendResponse({ success: true, hasPrevious: false });
              return;
            }
            
            // Tab exists, try to send message
            console.log('Sending setPreviousExplanation message to tab', tabId);
            chrome.tabs.sendMessage(tabId, {
              action: 'setPreviousExplanation',
              text: selectedText,
              previousText: previousResult.text,
              explanation: previousResult.explanation
            }).then(() => {
              console.log('Successfully sent previous explanation to tab');
              sendResponse({ success: true, hasPrevious: true, sent: true });
            }).catch(err => {
              console.error('Could not send previous explanation to tab:', err);
              chrome.runtime.lastError; // Clear any error
              sendResponse({ success: true, hasPrevious: true, sent: false, error: err.toString() });
            });
          });
        } else {
          console.log('No tabId available to send previous explanation');
          sendResponse({ success: true, hasPrevious: true, sent: false });
        }
      } else {
        // No previous result found
        console.log('No previous explanation found for:', selectedText);
        sendResponse({ success: true, hasPrevious: false });
      }
    }).catch(error => {
      console.error('Error checking for previous explanation:', error);
      sendResponse({ success: true, hasPrevious: false });
    });
    
    return true; // Keep the message channel open for the async response
  }
  else if (request.action === 'queryPerplexity') {
    // Store the tab ID for later use
    const tabId = sender.tab?.id;
    console.log('Received query request for:', request.text || selectedText);
    
    // Send immediate acknowledgment
    sendResponse({ received: true });
    
    // Use the text provided in the request, or fall back to the stored selectedText
    const textToQuery = request.text || selectedText;
    
    if (!textToQuery) {
      console.error('No text to query');
      return false;
    }
    
    // Query Perplexity API and save the result
    queryPerplexity(textToQuery).then(explanation => {
      perplexityResponse = explanation;
      console.log('Perplexity response:', perplexityResponse);
      
      // Save to storage with explanation
      saveSelectedText(textToQuery, perplexityResponse);
      
      // Safely send the explanation back to the content script
      if (tabId) {
        // Check if the tab still exists first
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            // Tab no longer exists
            console.log('Tab no longer exists:', chrome.runtime.lastError.message);
            return;
          }
          
          // Tab exists, try to send message
          chrome.tabs.sendMessage(tabId, {
            action: 'setPerplexityResponse',
            text: textToQuery,
            explanation: perplexityResponse
          }).catch(err => {
            // Handle error but don't crash
            console.log('Could not send message to tab:', err);
            chrome.runtime.lastError; // Clear any error
          });
        });
      }
    }).catch(error => {
      console.error('Failed to process request:', error);
      perplexityResponse = 'API error occurred';
      
      // Try to notify the content script about the error
      if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
          if (!chrome.runtime.lastError) {
            chrome.tabs.sendMessage(tabId, {
              action: 'setPerplexityResponse',
              text: textToQuery,
              explanation: 'API error occurred',
              error: true
            }).catch(() => chrome.runtime.lastError); // Suppress errors
          }
        });
      }
    });
    
    return false; // We're handling the response separately
  }
  else if (request.action === 'detailedInsight') {
    // Store the tab ID for later use
    const tabId = sender.tab?.id;
    console.log('Received detailed insight request for:', request.text || selectedText);
    
    // Send immediate acknowledgment
    sendResponse({ received: true });
    
    // Use the text provided in the request, or fall back to the stored selectedText
    const textToQuery = request.text || selectedText;
    
    if (!textToQuery) {
      console.error('No text to query for detailed insight');
      return false;
    }
    
    // Query Perplexity API for detailed insight and save the result
    getDetailedInsight(textToQuery).then(detailedInsight => {
      // Save to storage with the detailed insight
      saveSelectedText(textToQuery, `Detailed Insight: ${detailedInsight}`);
      
      // Safely send the detailed insight back to the content script
      if (tabId) {
        // Check if the tab still exists first
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            // Tab no longer exists
            console.log('Tab no longer exists:', chrome.runtime.lastError.message);
            return;
          }
          
          // Tab exists, try to send message
          chrome.tabs.sendMessage(tabId, {
            action: 'setDetailedInsight',
            text: textToQuery,
            detailedInsight: detailedInsight
          }).catch(err => {
            // Handle error but don't crash
            console.log('Could not send message to tab:', err);
            chrome.runtime.lastError; // Clear any error
          });
        });
      }
    }).catch(error => {
      console.error('Failed to process detailed insight request:', error);
      
      // Try to notify the content script about the error
      if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
          if (!chrome.runtime.lastError) {
            chrome.tabs.sendMessage(tabId, {
              action: 'setDetailedInsight',
              text: textToQuery,
              detailedInsight: 'API error occurred',
              error: true
            }).catch(() => chrome.runtime.lastError); // Suppress errors
          }
        });
      }
    });
    
    return false; // We're handling the response separately
  }
  else if (request.action === 'followUpQuestion') {
    // Store the tab ID for later use
    const tabId = sender.tab?.id;
    console.log('Received follow-up question:', request.question);
    
    // Send immediate acknowledgment
    sendResponse({ received: true });
    
    if (!request.originalText || !request.originalInsight || !request.question) {
      console.error('Missing required data for follow-up question');
      return false;
    }
    
    // Process the follow-up question without saving to storage
    handleFollowUpQuestion(
      request.originalText, 
      request.originalInsight, 
      request.question
    ).then(followUpResponse => {
      // Safely send the follow-up response back to the content script
      if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.log('Tab no longer exists:', chrome.runtime.lastError.message);
            return;
          }
          
          chrome.tabs.sendMessage(tabId, {
            action: 'setFollowUpResponse',
            followUpResponse: followUpResponse
          }).catch(err => {
            console.log('Could not send follow-up message to tab:', err);
            chrome.runtime.lastError;
          });
        });
      }
    }).catch(error => {
      console.error('Failed to process follow-up question:', error);
      
      if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
          if (!chrome.runtime.lastError) {
            chrome.tabs.sendMessage(tabId, {
              action: 'setFollowUpResponse',
              followUpResponse: 'Failed to process follow-up question',
              error: true
            }).catch(() => chrome.runtime.lastError);
          }
        });
      }
    });
    
    return false; // Handling asynchronously
  }
  else if (request.action === 'customQuestion') {
    console.log('Received custom question request');
    
    // Send immediate acknowledgment
    sendResponse({ received: true });
    
    // Process the question
    handleCustomQuestion(
      request.question,
      request.context || '',
      request.imageData || ''
    ).then(answer => {
      // Find the tab that sent the request
      const tabId = sender.tab?.id;
      if (!tabId) {
        console.error('No tab ID available for custom question response');
        return;
      }
      
      // Send the answer back to the content script
      chrome.tabs.sendMessage(tabId, {
        action: 'customQuestionResponse',
        answer: answer
      }).catch(err => {
        console.error('Failed to send custom question response:', err);
        chrome.runtime.lastError; // Clear any error
      });
    }).catch(error => {
      console.error('Error processing custom question:', error);
      
      // Try to send error back to content script
      const tabId = sender.tab?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          action: 'customQuestionResponse',
          error: true,
          message: error.message || 'Unknown error'
        }).catch(() => chrome.runtime.lastError);
      }
    });
    
    return true; // Keep the message channel open for the async response
  }
  return false; // Not handling this message asynchronously
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    sendResponse({ 
      selectedText,
      perplexityResponse 
    });
    return false; // Already sent response
  } 
  else if (request.action === 'getSelections') {
    // Return all saved selections (this is async)
    chrome.storage.local.get('selections', (result) => {
      // Safely send response, handling possible errors
      try {
        sendResponse({ selections: result.selections || [] });
      } catch (error) {
        console.error('Error sending selections response:', error);
        chrome.runtime.lastError; // Clear any error
      }
    });
    return true; // Keep connection open for async response
  } 
  else if (request.action === 'clearSelections') {
    // Clear all saved selections (this is async)
    chrome.storage.local.remove('selections', () => {
      // Safely send response, handling possible errors
      try {
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error sending clear response:', error);
        chrome.runtime.lastError; // Clear any error
      }
    });
    return true; // Keep connection open for async response
  }
  else if (request.action === 'queryButtonClick') {
    console.log('Query button clicked in popup');
    
    // Use the text provided in the request, or fall back to the stored selectedText
    const textToQuery = request.text || selectedText;
    
    if (!textToQuery) {
      sendResponse({ error: 'No text selected to query' });
      return false;
    }
    
    // Send immediate acknowledgment
    sendResponse({ received: true, processing: true });
    
    // Query Perplexity API and save the result
    queryPerplexity(textToQuery).then(explanation => {
      perplexityResponse = explanation;
      console.log('Perplexity response from button click:', perplexityResponse);
      
      // Save to storage with explanation
      saveSelectedText(textToQuery, perplexityResponse);
      
      // No need to send a message to a tab since this came from the popup
      // The popup can request the latest data when needed
    }).catch(error => {
      console.error('Failed to process popup request:', error);
      perplexityResponse = 'API error occurred';
    });
    
    return false; // We already sent an acknowledgment response
  }
  else if (request.action === 'detailedInsightButtonClick') {
    console.log('Detailed insight button clicked in popup');
    
    // Use the text provided in the request, or fall back to the stored selectedText
    const textToQuery = request.text || selectedText;
    
    if (!textToQuery) {
      sendResponse({ error: 'No text selected for detailed insight' });
      return false;
    }
    
    // Send immediate acknowledgment
    sendResponse({ received: true, processing: true });
    
    // Query Perplexity API for detailed insight
    getDetailedInsight(textToQuery).then(detailedInsight => {
      // Save the detailed insight to storage
      saveSelectedText(textToQuery, `Detailed Insight: ${detailedInsight}`);
      
      // Save for immediate fetch by popup
      perplexityResponse = detailedInsight;
      
      // No need to send a message to a tab since this came from the popup
      // The popup can request the latest data when needed
    }).catch(error => {
      console.error('Failed to process popup detailed insight request:', error);
      perplexityResponse = 'API error occurred';
    });
    
    return false; // We already sent an acknowledgment response
  }
  else if (request.action === 'popupFollowUpQuestion') {
    console.log('Follow-up question from popup:', request.question);
    
    if (!request.originalText || !request.originalInsight || !request.question) {
      sendResponse({ error: 'Missing required data for follow-up question' });
      return false;
    }
    
    // Send immediate acknowledgment
    sendResponse({ received: true, processing: true });
    
    // Process the follow-up question without saving to storage
    handleFollowUpQuestion(
      request.originalText,
      request.originalInsight,
      request.question
    ).then(followUpResponse => {
      // Store for immediate fetch by popup
      perplexityResponse = followUpResponse;
    }).catch(error => {
      console.error('Failed to process popup follow-up question:', error);
      perplexityResponse = 'Failed to process follow-up question';
    });
    
    return false; // Already sent acknowledgment
  }
  return false; // Not handling this message asynchronously
});