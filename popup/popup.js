import { generateContent } from '../utils/api.js';

const DOM = {
  settingsView: document.getElementById('settings-view'),
  mainView: document.getElementById('main-view'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveKeyBtn: document.getElementById('save-key-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  
  summarizeBtn: document.getElementById('summarize-btn'),
  contextActionBtn: document.getElementById('context-action-btn'),
  contextActionLabel: document.getElementById('context-action-label'),
  insightDropdown: document.getElementById('insight-dropdown'),
  insightBtn: document.getElementById('insight-btn'),
  
  loading: document.getElementById('loading'),
  resultView: document.getElementById('result-view'),
  resultContent: document.getElementById('result-content'),
  clearBtn: document.getElementById('clear-btn'),
  actions: document.querySelector('.actions')
};

let pageContext = {
  title: "",
  text: "",
  type: "general",
  url: ""
};

async function init() {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) {
    showSettings();
  } else {
    showMain();
    await loadPageContext();
  }

  // Event Listeners
  DOM.saveKeyBtn.addEventListener('click', saveApiKey);
  DOM.settingsBtn.addEventListener('click', showSettings);
  
  DOM.summarizeBtn.addEventListener('click', () => askGemini("Summarize this webpage content into key bullet points with crisp, clear descriptions. You must format every single point as a list item starting with '* ' or '- ' on a new line, and you MUST bold the primary key term or phrase in each bullet point using **markdown**. Do not group them into paragraphs."));
  DOM.contextActionBtn.addEventListener('click', handleContextAction);
  DOM.insightBtn.addEventListener('click', handleInsight);
  DOM.clearBtn.addEventListener('click', clearResult);
}

function showSettings() {
  DOM.settingsView.classList.remove('hidden');
  DOM.mainView.classList.add('hidden');
  chrome.storage.local.get(['apiKey'], (res) => {
    if (res.apiKey) DOM.apiKeyInput.value = res.apiKey;
  });
}

function showMain() {
  DOM.settingsView.classList.add('hidden');
  DOM.mainView.classList.remove('hidden');
}

async function saveApiKey() {
  const key = DOM.apiKeyInput.value.trim();
  if (key) {
    await chrome.storage.local.set({ apiKey: key });
    showMain();
    await loadPageContext();
  }
}

async function loadPageContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;
    
    const tab = tabs[0];
    const url = tab.url || "";
    
    // Determine page type roughly by URL
    if (url.includes('mail.google.com') || url.includes('outlook.live.com')) {
      pageContext.type = 'email';
      DOM.contextActionLabel.innerText = "Draft Reply";
    } else if (url.includes('linkedin.com/jobs') || url.includes('indeed.com')) {
      pageContext.type = 'job';
      DOM.contextActionLabel.innerText = "Extract Job Requirements";
    } else if (url.includes('amazon.com') || url.includes('ebay.com')) {
      pageContext.type = 'product';
      DOM.contextActionLabel.innerText = "Summarize Reviews/Features";
    } else {
      pageContext.type = 'article';
      DOM.contextActionLabel.innerText = "Extract Key Insights";
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: "getPageContent" });
    if (response) {
      pageContext.title = response.title;
      pageContext.text = response.text;
      pageContext.url = url;
    }
  } catch (err) {
    console.error("Could not get page context. Content script may not be loaded.", err);
  }
}

function handleContextAction() {
  let prompt = "";
  switch(pageContext.type) {
    case 'email': prompt = "Based on this email thread, draft a professional and concise reply."; break;
    case 'job': prompt = "Extract the core requirements, skills needed, and responsibilities for this job posting."; break;
    case 'product': prompt = "Summarize the main features and general sentiment/pros and cons from this product page."; break;
    default: prompt = "Extract the most important insights and takeaways from this article."; break;
  }
  askGemini(prompt);
}

function handleInsight() {
  const insightStr = DOM.insightDropdown.value;
  if (!insightStr) return;
  
  let prompt = "";
  if (insightStr === 'explain-5') prompt = "Explain the content of this page as if I'm 5 years old.";
  if (insightStr === 'key-risks') prompt = "Identify and list any potential risks, downsides, or warnings mentioned in this text.";
  if (insightStr === 'pros-cons') prompt = "List the pros and cons discussed or implied in this page.";
  
  askGemini(prompt);
}

async function askGemini(prompt) {
  if (!pageContext.text) {
    alert("No content found on this page or content script not injected.");
    return;
  }

  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) {
    showSettings();
    return;
  }

  DOM.actions.classList.add('hidden');
  DOM.loading.classList.remove('hidden');
  DOM.resultView.classList.add('hidden');

  const cacheKey = `cache_${pageContext.url}_${prompt}`;
  try {
    const cachedData = await chrome.storage.local.get([cacheKey, 'cache_keys']);
    
    // Cache Hit
    if (cachedData[cacheKey]) {
      DOM.resultContent.innerHTML = cachedData[cacheKey];
      DOM.resultView.classList.remove('hidden');
      DOM.loading.classList.add('hidden');
      DOM.actions.classList.remove('hidden');
      return;
    }

    const fullPrompt = `${prompt}\n\n--- Page Title: ${pageContext.title} ---\n\n--- Page Content Start ---\n${pageContext.text}\n--- Page Content End ---`;
    const rawResult = await generateContent(apiKey, fullPrompt);
    
    // Parse the result line-by-line into interactive boxes
    let formattedHtml = '';
    const lines = rawResult.split('\n');
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed);
      let contentHtml = trimmed.replace(/^[*\-\d.]+\s*/, '') // Remove list syntax
                               .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      if (isBullet) {
        let textLower = contentHtml.toLowerCase();
        let boxClass = 'sticky-yellow';
        if (textLower.includes('risk') || textLower.includes('con:') || textLower.includes('cons:') || textLower.includes('warning') || textLower.includes('downside')) {
          boxClass = 'sticky-pink';
        } else if (textLower.includes('pro:') || textLower.includes('pros:') || textLower.includes('benefit') || textLower.includes('advantage')) {
          boxClass = 'sticky-green';
        } else if (textLower.includes('important') || textLower.includes('key')) {
          boxClass = 'sticky-blue';
        } else if (Math.random() > 0.7) {
           boxClass = ['sticky-blue', 'sticky-pink', 'sticky-green'][Math.floor(Math.random() * 3)];
        }
        // Using a standard bullet to maintain pure layout visual
        formattedHtml += `<div class="result-box sticky ${boxClass}"><span class="box-bullet">•</span><div class="result-box-text">${contentHtml}</div></div>`;
      } else {
        formattedHtml += `<p>${contentHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
      }
    }
      
    // Save to Cache (maintaining max 20 entries to prevent local storage bloat)
    let keysObj = cachedData['cache_keys'] || [];
    keysObj.push(cacheKey);
    
    // Evict oldest if > 20
    if (keysObj.length > 20) {
      const oldestKey = keysObj.shift();
      await chrome.storage.local.remove(oldestKey);
    }
    
    await chrome.storage.local.set({
      [cacheKey]: formattedHtml,
      'cache_keys': keysObj
    });
    
    DOM.resultContent.innerHTML = formattedHtml;
    DOM.resultView.classList.remove('hidden');
  } catch (error) {
    DOM.resultContent.innerHTML = `<span style="color: #ef4444;">Error: ${error.message}</span>`;
    DOM.resultView.classList.remove('hidden');
  } finally {
    DOM.loading.classList.add('hidden');
    DOM.actions.classList.remove('hidden');
  }
}

function clearResult() {
  DOM.resultView.classList.add('hidden');
  DOM.resultContent.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', init);
