#!/usr/bin/env python3
"""
G4F (GPT4Free) client for handling free AI completions
"""
import sys
import json
import asyncio
from g4f.client import Client

def create_g4f_client():
    """Create a g4f client with fallback providers"""
    return Client()

async def chat_completion(messages, model="gpt-4o-mini", temperature=0.7, max_tokens=2000):
    """
    Generate chat completion using g4f
    """
    try:
        client = create_g4f_client()
        
        # Convert messages to g4f format
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Make the request
        response = client.chat.completions.create(
            model=model,
            messages=formatted_messages,
            stream=False
        )
        
        content = response.choices[0].message.content
        
        # Estimate tokens (rough approximation)
        tokens = len(content.split()) * 1.3  # rough token estimate
        
        return {
            "content": content,
            "tokens": int(tokens),
            "cost": 0.0,  # Free service
            "provider": "g4f"
        }
        
    except Exception as e:
        raise Exception(f"G4F completion failed: {str(e)}")

def main():
    """Main function to handle command line requests"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        messages = data.get("messages", [])
        model = data.get("model", "gpt-4o-mini")
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens", 2000)
        
        # Run async function
        result = asyncio.run(chat_completion(messages, model, temperature, max_tokens))
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "provider": "g4f"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()