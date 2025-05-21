import React, { useEffect, useState, useRef } from 'react';
import authService from '../services/AuthService';
import KnowledgeGraph from '../components/KnowledgeGraph';

interface Selection {
  text: string;
  explanation: string;
  timestamp: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

const Popup: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [savedSelections, setSavedSelections] = useState<Selection[]>([]);
  const [pageSummary, setPageSummary] = useState<string>('');
  const [isSummarisingPage, setIsSummarisingPage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [isDetailedInsight, setIsDetailedInsight] = useState<boolean>(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string>('');
  const [isAskingFollowUp, setIsAskingFollowUp] = useState<boolean>(false);
  const [followUpResponse, setFollowUpResponse] = useState<string>('');
  const [originalInsight, setOriginalInsight] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'insights' | 'graph'>('insights');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  
  const explainButtonRef = useRef<HTMLButtonElement>(null);
  const detailedInsightButtonRef = useRef<HTMLButtonElement>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isInitialized = await authService.initialize();
        if (isInitialized && authService.isAuthenticated()) {
          setUser(authService.getUser());
        }
      } catch (error) {
        console.error('Failed to check authentication:', error);
      }
    };
    
    checkAuth();
  }, []);
  
  // Handle sign in
  const handleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      const success = await authService.authenticate();
      if (success) {
        setUser(authService.getUser());
      }
    } catch (error) {
      console.error('Failed to authenticate:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };
  
  const askLens = () => {
    if (selectedText) {
      setIsExplaining(true);
      setExplanation(''); // Clear any previous explanation
      
      chrome.runtime.sendMessage({
        action: 'queryButtonClick',
        text: selectedText
      }, response => {
        if (response && response.received) {
          console.log('Request received, processing...');
          
          // Poll for results after a short delay
          setTimeout(checkForResults, 1000);
        } else if (response && response.error) {
          console.error('Error:', response.error);
          setExplanation(`Error: ${response.error}`);
          setIsExplaining(false);
        }
      });
    }
  };
  
  // Function to check for results
  const checkForResults = () => {
    chrome.runtime.sendMessage(
      { action: 'getSelectedText' },
      (response) => {
        if (response && response.perplexityResponse) {
          setExplanation(response.perplexityResponse);
          setIsExplaining(false);
        } else {
          // If no result yet, poll again
          setTimeout(checkForResults, 1000);
        }
      }
    );
  };

  // Function to get detailed insight
  const getDetailedInsight = () => {
    if (selectedText) {
      setIsDetailedInsight(true);
      setExplanation(''); // Clear any previous explanation
      setFollowUpResponse(''); // Clear any previous follow-up
      
      chrome.runtime.sendMessage({
        action: 'detailedInsightButtonClick',
        text: selectedText
      }, response => {
        if (response && response.received) {
          console.log('Detailed insight request received, processing...');
          
          // Poll for results after a short delay
          setTimeout(checkForDetailedInsight, 1000);
        } else if (response && response.error) {
          console.error('Detailed insight error:', response.error);
          setExplanation(`Error: ${response.error}`);
          setIsDetailedInsight(false);
        }
      });
    }
  };
  
  // Function to check for detailed insight results
  const checkForDetailedInsight = () => {
    chrome.runtime.sendMessage(
      { action: 'getSelectedText' },
      (response) => {
        if (response && response.perplexityResponse) {
          setExplanation(response.perplexityResponse);
          setIsDetailedInsight(false);
        } else {
          // If no result yet, poll again
          setTimeout(checkForDetailedInsight, 1000);
        }
      }
    );
  };

  // Function to submit a follow-up question
  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!followUpQuestion.trim()) {
      return;
    }
    
    setIsAskingFollowUp(true);
    
    chrome.runtime.sendMessage({
      action: 'popupFollowUpQuestion',
      originalText: selectedText,
      originalInsight: originalInsight,
      question: followUpQuestion
    }, response => {
      if (response && response.received) {
        console.log('Follow-up question received, processing...');
        
        // Poll for results after a short delay
        setTimeout(checkForFollowUpResponse, 1000);
      } else if (response && response.error) {
        console.error('Follow-up error:', response.error);
        setFollowUpResponse(`Error: ${response.error}`);
        setIsAskingFollowUp(false);
      }
    });
  };
  
  // Function to check for follow-up response
  const checkForFollowUpResponse = () => {
    chrome.runtime.sendMessage(
      { action: 'getSelectedText' },
      (response) => {
        if (response && response.perplexityResponse) {
          setFollowUpResponse(response.perplexityResponse);
          setIsAskingFollowUp(false);
        } else {
          // If no result yet, poll again
          setTimeout(checkForFollowUpResponse, 1000);
        }
      }
    );
  };

  // Function to summarise the entire page
  const summarisePage = () => {
    setIsSummarisingPage(true);
    setPageSummary('');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (resp) => {
          const content = resp?.content || '';
          chrome.runtime.sendMessage({ action: 'summarisePage', content }, (response) => {
            setPageSummary(response.summary || response.error || '');
            setIsSummarisingPage(false);
          });
        });
      } else {
        setPageSummary('Unable to retrieve active tab content.');
        setIsSummarisingPage(false);
      }
    });
  };

  useEffect(() => {
    // Get active tab and send message to get any selected text
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: 'getSelectedText' },
          (response) => {
            if (response && response.selectedText) {
              setSelectedText(response.selectedText);
            }
            setLoading(false);
          }
        );
      }
    });

    // Get current selected text from background script
    chrome.runtime.sendMessage(
      { action: 'getSelectedText' },
      (response) => {
        if (response && response.selectedText) {
          setSelectedText(response.selectedText);
        }
      }
    );

    // Get saved selections from storage
    chrome.runtime.sendMessage(
      { action: 'getSelections' },
      (response) => {
        if (response && response.selections) {
          setSavedSelections(response.selections);
        }
      }
    );
    
    // Set up the button click event handler
    if (explainButtonRef.current) {
      explainButtonRef.current.addEventListener('click', askLens);
    }
    
    // Set up the detailed insight button click event handler
    if (detailedInsightButtonRef.current) {
      detailedInsightButtonRef.current.addEventListener('click', getDetailedInsight);
    }
    
    // Cleanup function
    return () => {
      if (explainButtonRef.current) {
        explainButtonRef.current.removeEventListener('click', askLens);
      }
      if (detailedInsightButtonRef.current) {
        detailedInsightButtonRef.current.removeEventListener('click', getDetailedInsight);
      }
    };
  }, [selectedText]); // Include selectedText in dependencies since both functions use it

  // Store the original detailed insight when it's received
  useEffect(() => {
    if (explanation.startsWith('Detailed Insight:')) {
      setOriginalInsight(explanation.substring(17));
    }
  }, [explanation]);

  const exportToCSV = () => {
    // Create CSV content from saved selections
    const csvContent = [
      ['Text', 'Explanation', 'Timestamp'].join(','),
      ...savedSelections.map(selection => 
        [
          `"${selection.text.replace(/"/g, '""')}"`, 
          `"${selection.explanation.replace(/"/g, '""')}"`, 
          selection.timestamp
        ].join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `perplexity-selections-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearSelections = () => {
    chrome.runtime.sendMessage(
      { action: 'clearSelections' },
      () => {
        setSavedSelections([]);
      }
    );
  };

  return (
    <div className="w-80 bg-white">
      {/* Header with auth */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-purple-800">Perplexity Lens</h1>
          
          {user ? (
            <div className="flex items-center">
              {user.picture && (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-6 h-6 rounded-full mr-2"
                />
              )}
              <div className="text-xs text-gray-600 mr-2">{user.name}</div>
              <button 
                onClick={handleSignOut}
                className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              {isAuthenticating ? 'Signing in...' : 'Sign In'}
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex mt-4">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-tl-md rounded-tr-md ${
              activeTab === 'insights' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-tl-md rounded-tr-md ${
              activeTab === 'graph' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setActiveTab('graph')}
          >
            Knowledge Graph
          </button>
        </div>
      </div>

      {/* Insights Tab Content */}
      {activeTab === 'insights' && (
        <div className="p-4">
          {/* Ensure buttons are always visible with fixed styles */}
          <div className="mb-4 mt-2 grid grid-cols-1 gap-2">
            <button 
              id="explainButton"
              ref={explainButtonRef}
              onClick={askLens}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 font-medium"
              disabled={!selectedText || isExplaining || isDetailedInsight}
              style={{ display: 'block' }}>
              {isExplaining ? 'Getting explanation...' : 'Ask Perplexity'}
            </button>
            
            <button 
              id="detailedInsightButton"
              ref={detailedInsightButtonRef}
              onClick={getDetailedInsight}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 font-medium"
              disabled={!selectedText || isExplaining || isDetailedInsight}
              style={{ display: 'block' }}>
              {isDetailedInsight ? 'Getting detailed insight...' : 'Detailed Insight'}
            </button>
            
            <button
              onClick={summarisePage}
              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 font-medium"
              disabled={isSummarisingPage}
            >
              {isSummarisingPage ? 'Summarising...' : 'Summarise This Page'}
            </button>
          </div>

          {pageSummary && (
              <div className="mt-4 p-2 bg-green-50 rounded text-sm">
                <p className="font-medium text-gray-700">Page Summary:</p>
                <div
                  className="mt-1 text-gray-600 detailed-insight"
                  dangerouslySetInnerHTML={{ __html: formatDetailedInsight(pageSummary) }}
                />
              </div>
            )}
          
          <div className="border-t border-gray-200 pt-2">
            {loading ? (
              <p className="text-gray-700">Loading...</p>
            ) : selectedText ? (
              <div className="mt-2">
                <p className="text-gray-700">Selected text: "{selectedText.length > 50 
                  ? selectedText.substring(0, 47) + '...' 
                  : selectedText}"</p>
                  
                {explanation ? (
                  <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                    <p className="font-medium text-gray-700">
                      {explanation.startsWith('Detailed Insight:') ? 'Detailed Insight:' : 'Perplexity says:'}
                    </p>
                    <div className="mt-1 text-gray-600 detailed-insight" 
                      dangerouslySetInnerHTML={{ 
                        __html: explanation.startsWith('Detailed Insight:') 
                          ? formatDetailedInsight(explanation.substring(17)) 
                          : explanation 
                      }}>
                    </div>
                    
                    {/* Add follow-up question UI only for detailed insights */}
                    {explanation.startsWith('Detailed Insight:') && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <form onSubmit={handleFollowUpSubmit} className="flex flex-col gap-2">
                          <p className="text-xs font-medium text-gray-700">Ask a follow-up question:</p>
                          <input
                            type="text"
                            value={followUpQuestion}
                            onChange={(e) => setFollowUpQuestion(e.target.value)}
                            className="w-full text-xs p-1.5 border border-gray-300 rounded"
                            placeholder="Type your question here..."
                            disabled={isAskingFollowUp}
                          />
                          <button
                            type="submit"
                            className="w-full bg-teal-500 text-white py-1 px-2 rounded text-xs font-medium hover:bg-teal-600"
                            disabled={!followUpQuestion.trim() || isAskingFollowUp}
                          >
                            {isAskingFollowUp ? 'Processing...' : 'Ask'}
                          </button>
                        </form>
                        
                        {/* Display follow-up response if available */}
                        {followUpResponse && (
                          <div className="mt-2 p-2 bg-teal-50 rounded text-xs">
                            <p className="font-medium text-gray-700">Follow-up response:</p>
                            <div 
                              className="mt-1 text-gray-600"
                              dangerouslySetInnerHTML={{ __html: formatDetailedInsight(followUpResponse) }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : isExplaining || isDetailedInsight ? (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    {isDetailedInsight ? 'Getting detailed insight...' : 'Getting explanation...'}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500 italic">Use buttons above to analyze this text</p>
                )}
              </div>
            ) : (
              <p className="text-gray-700">No text currently selected</p>
            )}

            {savedSelections.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-medium text-sm text-gray-600">Saved Selections ({savedSelections.length})</h2>
                  <div className="space-x-2">
                    <button 
                      onClick={exportToCSV}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                      Export CSV
                    </button>
                    <button 
                      onClick={clearSelections}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                  {savedSelections.slice().reverse().map((selection, index) => (
                    <div key={index} className="p-2 border-b border-gray-200 last:border-b-0 text-sm">
                      <p className="font-medium break-words">{selection.text.length > 50 
                        ? selection.text.substring(0, 47) + '...' 
                        : selection.text}</p>
                      {selection.explanation && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {selection.explanation}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selection.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
          </div>
        </div>
      )}

      {/* Graph Tab Content */}
      {activeTab === 'graph' && (
        <div className="p-4">
          {user ? (
            <KnowledgeGraph width={300} height={250} />
          ) : (
            <div className="text-center p-4 border border-gray-200 rounded bg-gray-50">
              <p className="text-gray-600 mb-3">Sign in to see your knowledge graph</p>
              <button 
                onClick={handleSignIn}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                Sign In
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Function to format detailed insight for the popup
function formatDetailedInsight(insight: string): string {
  // Add some basic formatting
  let formatted = insight.replace(/\n/g, '<br>');
  
  // Highlight any numerical data with bold
  formatted = formatted.replace(/(\d+(\.\d+)?%?)/g, '<strong>$1</strong>');
  
  // Identify and format list items
  formatted = formatted.replace(/^(-|\*|\d+\.)\s+(.+)$/gm, '<li>$2</li>');
  
  return formatted;
}

export default Popup; 