from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os
import re
from dotenv import load_dotenv
from google import genai
# pyrefly: ignore [missing-import]
from pymongo import MongoClient

load_dotenv()

# Initialize MongoDB Client
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI environment variable is not set. Please add it to your .env file.")

mongo_client = MongoClient(mongo_uri)
db = mongo_client["enpassant"]
metrics_collection = db["metrics_collection"]
cache_collection = db["cache_collection"]

app = FastAPI(title="EnPassant Proxy", version="1.0.0")

# Configure CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str

@app.on_event("startup")
async def startup_db_client():
    # Initialize the global metrics document if it doesn't exist
    metrics_doc = metrics_collection.find_one({"_id": "global_metrics"})
    if not metrics_doc:
        metrics_collection.insert_one({
            "_id": "global_metrics",
            "total_requests": 0,
            "emails_blocked": 0,
            "phones_blocked": 0,
            "cc_blocked": 0,
            "cache_hits": 0
        })
        print("[DATABASE]: Initialized global metrics counters to 0.")
    else:
        print("[DATABASE]: Connected to existing global metrics counters.")

@app.get("/health")
async def health_check():
    return {"status": "Gateway Online", "version": "1.0.0"}

@app.get("/v1/metrics")
async def get_metrics():
    doc = metrics_collection.find_one({"_id": "global_metrics"})
    if not doc:
        return {
            "total_requests": 0,
            "emails_blocked": 0,
            "phones_blocked": 0,
            "cc_blocked": 0,
            "cache_hits": 0
        }
    # Remove internal _id field before returning
    doc.pop("_id", None)
    return doc

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API Key is not configured. Please create a .env file under /backend with GEMINI_API_KEY."
        )
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize Gemini Client: {str(e)}"
        )

def redact_pii(text: str) -> tuple[str, int, int, int]:
    if not text:
        return text, 0, 0, 0
    # 1. Redact Emails
    text, email_count = re.subn(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL REDACTED]', text)
    
    # 2. Redact Phone Numbers (e.g. 123-456-7890, (123) 456-7890)
    text, phone_count = re.subn(r'\(?\b[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b', '[PHONE REDACTED]', text)
    
    # 3. Redact 16-digit Credit Cards (supports spaces/dashes between digits)
    text, cc_count = re.subn(r'\b(?:\d[- \.]?){15}\d\b', '[CC REDACTED]', text)
    
    return text, email_count, phone_count, cc_count

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    # Scrub PII from the incoming prompt
    scrubbed_prompt, email_count, phone_count, cc_count = redact_pii(request.prompt)
    print(f"[PII REDACTED PROMPT]: {scrubbed_prompt}")

    # Record request and PII counts in MongoDB
    metrics_collection.update_one(
        {"_id": "global_metrics"},
        {
            "$inc": {
                "total_requests": 1,
                "emails_blocked": email_count,
                "phones_blocked": phone_count,
                "cc_blocked": cc_count
            }
        }
    )

    # Check MongoDB query cache
    cached_doc = cache_collection.find_one({"prompt": scrubbed_prompt})
    if cached_doc:
        # Increment cache hits in MongoDB
        metrics_collection.update_one(
            {"_id": "global_metrics"},
            {"$inc": {"cache_hits": 1}}
        )
        print(f"[CACHE HIT]: {scrubbed_prompt}")
        text_content = cached_doc["response"]
        return {
            "id": f"chatcmpl-cache-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "gemini-2.5-flash",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": text_content
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": len(request.prompt) // 4,
                "completion_tokens": len(text_content) // 4,
                "total_tokens": (len(request.prompt) + len(text_content)) // 4
            }
        }

    # Cache miss
    client = get_gemini_client()
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=scrubbed_prompt,
        )
        text_content = response.text or ""
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API Error: {str(e)}"
        )

    # Store text response in MongoDB query cache
    cache_collection.insert_one({
        "prompt": scrubbed_prompt,
        "response": text_content,
        "created_at": time.time()
    })

    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "gemini-2.5-flash",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": text_content
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": len(request.prompt) // 4,
            "completion_tokens": len(text_content) // 4,
            "total_tokens": (len(request.prompt) + len(text_content)) // 4
        }
    }


