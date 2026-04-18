// Helper script to handle UI overlay for Gemini responses

let popupElement = null;

function createPopup() {
  if (popupElement) return popupElement;

  popupElement = document.createElement('div');
  popupElement.style.position = 'fixed';
  popupElement.style.bottom = '20px';
  popupElement.style.right = '20px';
  popupElement.style.width = '350px';
  popupElement.style.maxHeight = '400px';
  popupElement.style.overflowY = 'auto';
  popupElement.style.backgroundColor = '#1e1e1e';
  popupElement.style.color = '#ffffff';
  popupElement.style.borderRadius = '12px';
  popupElement.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
  popupElement.style.padding = '16px';
  popupElement.style.zIndex = '999999';
  popupElement.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  popupElement.style.fontSize = '14px';
  popupElement.style.lineHeight = '1.5';
  popupElement.style.border = '1px solid #333';
  popupElement.style.display = 'none';

  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '15px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '18px';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.onclick = () => {
    popupElement.style.display = 'none';
  };

  const contentDiv = document.createElement('div');
  contentDiv.id = 'gemini-content';
  contentDiv.style.marginTop = '10px';

  popupElement.appendChild(closeBtn);
  popupElement.appendChild(contentDiv);
  document.body.appendChild(popupElement);

  return popupElement;
}

window.showGeminiLoading = function() {
  const popup = createPopup();
  const content = popup.querySelector('#gemini-content');
  content.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><div class="loader"></div><span>Asking Gemini...</span></div>';
  
  // Add simple animation styles if not present
  if (!document.getElementById('gemini-styles')) {
    const style = document.createElement('style');
    style.id = 'gemini-styles';
    style.innerHTML = `
      .loader {
        border: 3px solid #f3f3f3;
        border-radius: 50%;
        border-top: 3px solid #3498db;
        width: 16px;
        height: 16px;
        -webkit-animation: spin 1s linear infinite; /* Safari */
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  popup.style.display = 'block';
};

window.showGeminiResponse = function(text) {
  const popup = createPopup();
  const content = popup.querySelector('#gemini-content');
  
  // Basic markdown to HTML (just for line breaks and bold)
  let html = text
    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\n/g, '<br/>');
    
  content.innerHTML = `<div><strong>Gemini Says:</strong></div><div style="margin-top:10px;">${html}</div>`;
  popup.style.display = 'block';
};

// Message listener for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    sendResponse({ 
      title: document.title,
      text: document.body.innerText.substring(0, 50000) // Limits text to avoid huge payloads
    });
  }
});
