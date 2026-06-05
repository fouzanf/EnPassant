from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os
import re
from dotenv import load_dotenv
from google import genai
import certifi
# pyrefly: ignore [missing-import]
from pymongo import MongoClient

load_dotenv()

# Initialize MongoDB Client
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI environment variable is not set. Please add it to your .env file.")

mongo_client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = mongo_client["enpassant"]
metrics_collection = db["metrics_collection"]
cache_collection = db["cache_collection"]

app = FastAPI(title="EnPassant Proxy", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def get_gemini_client(client_api_key: str | None = None):
    api_key = client_api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API Key is not configured. Please create a .env file under /backend with GEMINI_API_KEY or provide it via the Authorization header."
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

# Simple in-memory rate limiting dictionary
rate_limit_records = {}
RATE_LIMIT_MAX_REQUESTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest, request_obj: Request, authorization: str | None = Header(default=None)):
    # Rate Limiter Logic
    client_ip = request_obj.client.host if request_obj.client else "unknown"
    current_time = time.time()
    
    timestamps = rate_limit_records.get(client_ip, [])
    valid_timestamps = [ts for ts in timestamps if current_time - ts < RATE_LIMIT_WINDOW_SECONDS]
    
    if len(valid_timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too Many Requests")
        
    valid_timestamps.append(current_time)
    rate_limit_records[client_ip] = valid_timestamps

    # Parse client API key from Authorization header
    client_api_key = None
    if authorization:
        parts = authorization.split()
        if len(parts) > 1 and parts[0].lower() == "bearer":
            client_api_key = parts[1]
        else:
            client_api_key = authorization.strip()

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
    client = get_gemini_client(client_api_key)
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


