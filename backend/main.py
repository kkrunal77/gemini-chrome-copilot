import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = FastAPI(title="Gemini Copilot Backend")

# Allow requests from the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")

# Use the new core google-genai library as requested and recommended
client = genai.Client(api_key=GEMINI_API_KEY)

class GenerateRequest(BaseModel):
    prompt: str
    system_instruction: str = ""

@app.post("/api/generate")
async def generate_content(request: GenerateRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key is missing on the server.")

    try:
        model = "gemini-2.5-flash"
        
        # We can pass system instructions as a system_instruction parameter or prepend to prompt
        full_prompt = request.prompt
        if request.system_instruction:
            full_prompt = request.system_instruction + "\n\n" + request.prompt

        response = client.models.generate_content(
            model=model,
            contents=full_prompt,
        )
        return {"response": response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=True)
