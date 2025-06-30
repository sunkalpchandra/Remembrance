import os
import asyncio
from google.adk.agents import Agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from mem0 import MemoryClient
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
# from dotenv import load_dotenv

os.environ.get("GOOGLE_API_KEY")

# Fixed API key retrieval
# google_api_key = os.environ.get("GOOGLE_API_KEY", "AIzaSyCCuDi-_ZuCEM7CO3lMlaQxj7LonLvrgbc")
memo_api_key = os.environ.get("MEMO_API_KEY")

# Initialize mem0 client with environment variable (fallback to your hardcoded key for now)
mem0_client = MemoryClient(api_key=memo_api_key)

app_name = "memory_alzheimers_assistant_app"

# Global variable to store current user_id (not ideal but necessary for this architecture)
current_user_id = None

def save_user_info(information: str, **kwargs) -> dict:
    """Save user information to memory"""
    global current_user_id
    user_id = kwargs.get("user_id") or current_user_id
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        response = mem0_client.add(
            [
                {
                    "role": "user",
                    "content": information
                }
            ],
            user_id=user_id,
            run_id="healthcare_session",
            metadata={"type": "client_information"}
        )
        return {"status": "saved", "details": response}
    except Exception as e:
        return {"status": "error", "message": f"Failed to save: {str(e)}"}

def retrieve_user_info(query: str, **kwargs) -> dict:
    """Retrieve user information from memory"""
    global current_user_id
    user_id = kwargs.get("user_id") or current_user_id
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        results = mem0_client.search(
            query,
            user_id=user_id,
            limit=5,
            threshold=0.7,
            output_format="v1.1",
        )

        if results and len(results) > 0:
            memories = [memory["memory"] for memory in results.get('results', [])]
            return {
                "status": "success",
                "memories": memories,
                "count": len(memories)
            }
        else:
            return {
                "status": "no_results",
                "memories": [],
                "count": 0
            }
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve: {str(e)}"}

# Initialize agent with improved instructions
memory_agent = Agent(
    name="healthcare_assistant",
    model="gemini-1.5-flash",
    description="Helping patients with memory issues log and retrieve their personal memories",
    instruction="""You are a compassionate memory assistant for people with Alzheimer's or memory difficulties. 

Your main functions are:
1. When users share personal information, experiences, or important details about their life, family, or routines, save this information using the save_user_info function.
2. When users ask questions or need to recall something, search their saved memories using retrieve_user_info function.
3. Always be patient, kind, and encouraging in your responses.
4. Help users organize their thoughts and memories in a clear, accessible way.
5. If you find relevant memories, present them in a helpful context.

Examples of information to save:
- Family members' names and relationships
- Important dates and events
- Daily routines and preferences
- Medical information shared by the user
- Personal interests and hobbies

Always respond in a warm, supportive tone and help users feel confident about managing their memories.""",
    tools=[save_user_info, retrieve_user_info]
)

session_service = InMemorySessionService()
app = Flask(__name__)
CORS(app)

async def process_query_async(query: str, user_id: str):
    """Async function to handle the agent processing"""
    global current_user_id
    current_user_id = user_id  # Set the global user_id
    
    session_id = f"session_{uuid.uuid4().hex[:8]}"
    
    # Create session asynchronously
    session = await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id
    )

    # Create runner without default_tool_kwargs
    runner = Runner(
        agent=memory_agent,
        app_name=app_name,
        session_service=session_service,
        # session=session,
        # tool_kwargs={"user_id": user_id}
    )

    # Run the agent with user_id in the context
    # The tools will get user_id through the session or we need to modify the approach
    final_result = None

    content = types.Content(
        role="user",
        parts=[types.Part(text=query)]
    )

    async for chunk in runner.run_async(
        user_id=user_id, 
        session_id=session_id, 
        new_message=content
    ):
        if chunk.is_final_response() and chunk.content and chunk.content.parts:
            final_result = chunk.content.parts[0].text
        # final_result = chunk
    # result = await runner.run_async(user_id=user_id, session_id=session_id, new_message=query)
    return final_result, session_id

@app.route("/query", methods=["POST"])
def handle_query():
    """Handle user queries with memory capabilities"""
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No JSON data provided"}), 400
            
        query = data.get("query")
        user_id = data.get("user_id")

        if not query or not user_id:
            return jsonify({"status": "error", "message": "Missing query or user_id"}), 400

        # Run the async function in a new event loop
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result, session_id = loop.run_until_complete(process_query_async(query, user_id))
            loop.close()
        except RuntimeError:
            # If there's already an event loop running, use asyncio.run
            result, session_id = asyncio.run(process_query_async(query, user_id))
        
        return jsonify({
            "status": "success",
            "result_return": result.text if hasattr(result, "text") else str(result),
            "session_id": session_id
        })
        
    except Exception as e:
        print(f"Error processing query: {str(e)}")  # For debugging
        return jsonify({
            "status": "error",
            "message": f"Server error: {str(e)}"
        }), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "service": "memory_assistant",
        "version": "1.0"
    })

@app.route("/user/<user_id>/memories", methods=["GET"])
def get_user_memories(user_id):
    """Get all memories for a specific user"""
    try:
        # You might want to implement a way to get all memories for a user
        # This is a placeholder endpoint
        return jsonify({
            "status": "success",
            "user_id": user_id,
            "message": "Memories endpoint - to be implemented"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    # Check for required environment variables
    required_vars = ["GOOGLE_API_KEY"]  # MEMO_API_KEY is optional due to fallback
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
    
    print("Starting Memory Assistant API server...")
    print(f"Server will run on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)