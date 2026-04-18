import { generateContent } from './utils/api.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ask-ai",
    title: "Ask Gemini",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "rewrite-professional",
    title: "Rewrite (Professional)",
    contexts: ["selection"],
    parentId: "ask-ai"
  });

  chrome.contextMenus.create({
    id: "rewrite-casual",
    title: "Rewrite (Casual)",
    contexts: ["selection"],
    parentId: "ask-ai"
  });

  chrome.contextMenus.create({
    id: "explain",
    title: "Explain this",
    contexts: ["selection"],
    parentId: "ask-ai"
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  const selectedText = info.selectionText;
  if (!selectedText) return;

  const { apiKey } = await chrome.storage.local.get(["apiKey"]);
  if (!apiKey) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert("Please set your Gemini API Key in the extension popup.")
    });
    return;
  }

  let prompt = "";
  if (info.menuItemId === "rewrite-professional") {
    prompt = `Rewrite the following text to carry a highly professional tone:\n\n"${selectedText}"`;
  } else if (info.menuItemId === "rewrite-casual") {
    prompt = `Rewrite the following text to carry a casual, friendly tone:\n\n"${selectedText}"`;
  } else if (info.menuItemId === "explain") {
    prompt = `Explain the following text simply, as if I'm 5 years old:\n\n"${selectedText}"`;
  } else {
    prompt = `Please explain or answer based on the following text:\n\n"${selectedText}"`;
  }

  try {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.showGeminiLoading && window.showGeminiLoading();
      }
    });

    const responseText = await generateContent(apiKey, prompt);

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (res) => {
        window.showGeminiResponse && window.showGeminiResponse(res);
      },
      args: [responseText]
    });
  } catch (error) {
    console.error(error);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (err) => alert(`Gemini API Error: ${err}`),
      args: [error.message]
    });
  }
});
