import os
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx

from app.core.dependencies import require_admin
from app.models.user import User

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

class ChatMessage(BaseModel):
    session_id: str
    message: str
    timestamp: str

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "https://n8n.n8nautomations.me/webhook/medical-chatbot")

@router.post("")
async def send_chatbot_message(
    payload: ChatMessage,
    current_user: User = Depends(require_admin)
):
    """
    Secure proxy for the N8N chatbot webhook. 
    Only authenticated admins can trigger this endpoint.
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(N8N_WEBHOOK_URL, json=payload.dict())
            
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="N8N Agent returned an error")
        
        # N8N can return JSON or plain text depending on the "Respond to Webhook" node config
        content_type = resp.headers.get("content-type", "")
        
        if "application/json" in content_type:
            # JSON response — return as-is or wrap it
            data = resp.json()
            # If it's already a dict with 'output' key, normalize it
            if isinstance(data, dict):
                reply = data.get("output") or data.get("response") or data.get("reply") or str(data)
            else:
                reply = str(data)
        else:
            # Plain text response from n8n
            reply = resp.text.strip()
        
        # Strip <think>...</think> tags that leak from AI model reasoning
        reply = re.sub(r'<think>[\s\S]*?</think>', '', reply, flags=re.DOTALL).strip()
        
        return {"response": reply}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to communicate with N8N agent: {str(e)}")
