export async function generateContent(apiKey, prompt, systemInstruction = "") {
  if (!apiKey) {
    throw new Error("Gemini API key is not set.");
  }

  // Uses the 2.5 flash model via direct API endpoint
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: (systemInstruction ? systemInstruction + "\n\n" : "") + prompt
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates.length > 0) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error("No response generated.");
  }
}
