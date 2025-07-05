# import os
# import asyncio
# from google.adk.agents import Agent
# from google.adk.sessions import InMemorySessionService
# from google.adk.runners import Runner
# from google.genai import types
# from mem0 import MemoryClient
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import uuid
# import contextvars
# # import nest_asyncio

# # nest_asyncio.apply()

# #  from dotenv import load_dotenv

# # os.environ.get("GOOGLE_API_KEY")

# # google_api_key = "AIzaSyCCuDi-_ZuCEM7CO3lMlaQxj7LonLvrgbc"

# google_api_key = os.environ.get("GOOGLE_API_KEY", "AIzaSyCCuDi-_ZuCEM7CO3lMlaQxj7LonLvrgbc")
# memo_api_key = os.environ.get("MEMO_API_KEY", "m0-DnaBPdlvNR4SbN3NZ4WH0Uc9N7MapzAWDSmGen8p")
# # memo_api_key = "none"

# mem0_client = MemoryClient(api_key=memo_api_key)

# app_name = "memory_alzheimers_assistant_app"

# # current_user_id = None
# current_user_id_var = contextvars.ContextVar("current_user_id", default=None)

# def save_user_info(information: str, **kwargs) -> dict:
#     """Save user information to memory"""
#     global current_user_id
#     user_id = kwargs.get("user_id") or current_user_id_var.get()
#     if not user_id:
#         return {"status": "error", "message": "user_id is missing"}
    
#     try:
#         print(f"[DEBUG] trying to save user_id={user_id}: {information}")
#         response = mem0_client.add(
#             [
#                 {
#                     "role": "user",
#                     "content": information
#                 }
#             ],
#             user_id=user_id,
#             run_id="healthcare_session",
#             metadata={"type": "client_information"},
#             version="v2"
#         )
#         # print("[TOOL CALL] save_user_info was triggered")
#         print(f"[DEBUG], mem0 response: {response}")
#         return {"status": "saved", "details": response}
#     except Exception as e:
#         print(f"[ERROR] exception in save_user_info: {e}")
#         return {"status": "error", "message": f"Failed to save: {str(e)}"}
    
# def retrieve_user_info(query: str, **kwargs) -> dict:
#     """Retrieve user information from memory"""
#     global current_user_id
#     user_id = kwargs.get("user_id") or current_user_id_var.get()
#     if not user_id:
#         return {"status": "error", "message": "user_id is missing"}
    
#     try:
#         results = mem0_client.search(
#             query,
#             user_id=user_id,
#             limit=5,
#             # threshold=0.7,
#             # output_format="v1.1",
#         )

#         if results and len(results) > 0:
#             memories = [memory["memory"] for memory in results.get('results', [])]
#             return {
#                 "status": "success",
#                 "memories": memories,
#                 "count": len(memories)
#             }
#         else:
#             return {
#                 "status": "no_results",
#                 "memories": [],
#                 "count": 0
#             }
#     except Exception as e:
#         return {"status": "error", "message": f"Failed to retrieve: {str(e)}"}

# memory_agent = Agent(
#     name="healthcare_assistant",
#     model="gemini-1.5-flash",
#     description="Helping patients with memory issues log and retrieve their personal memories",
#     instruction="""You are a compassionate memory assistant for people with Alzheimer's or memory difficulties. 

# Your main functions are:
# 1. When users share personal information, experiences, or important details about their life, family, or routines, save this information using the save_user_info function.
# 2. When users ask questions or need to recall something, search their saved memories using retrieve_user_info function.
# 3. Always be patient, kind, and encouraging in your responses.
# 4. Help users organize their thoughts and memories in a clear, accessible way.
# 5. If you find relevant memories, present them in a helpful context.

# Examples of information to save:
# - Family members' names and relationships
# - Important dates and events
# - Daily routines and preferences
# - Medical information shared by the user
# - Personal interests and hobbies

# Always respond in a warm, supportive tone and help users feel confident about managing their memories.""",
#     tools=[save_user_info, retrieve_user_info],
# )

# session_service = InMemorySessionService()
# app = Flask(__name__)
# CORS(app)

# async def process_query_async(messages:str, user_id: str):
#     """Async function to handle the agent processing"""
#     current_user_id_var.set(user_id)
#     # global current_user_id
#     current_user_id = user_id
    
#     session_id = f"session_{uuid.uuid4().hex[:8]}"
    
#     session = await session_service.create_session(
#         app_name=app_name,
#         user_id=user_id,
#         session_id=session_id
#     )

#     runner = Runner(
#         agent=memory_agent,
#         app_name=app_name,
#         session_service=session_service,
#         # session=session,
#         # tool_kwargs={"user_id": user_id}
#     )

#     if isinstance(messages, list) and messages:
#         content_parts = [
#             types.Content(
#                 role = "user" if msg.get("sentByUser", False) else "model",
#                 parts=[types.Part(text=msg["text"])]
#             )
#             for msg in messages
#         ]
#         new_message = content_parts[-1]
#         history = content_parts[:-1]

#     elif isinstance(messages, str):
#         new_message = types.Content(role="user", parts=[types.Part(text=messages)])
#         history = []

#     else:
#         raise ValueError("No valid messages provided.")
    
#     final_result = None
#     async for chunk in runner.run_async(
#         user_id=user_id,
#         session_id=session_id,
#         new_message=new_message,
#         # history=history
#     ):
#         if chunk.is_final_response() and chunk.content and chunk.content.parts:
#             final_result = chunk.content.parts[0].text
#         # final_result = chunk
#     # result = await runner.run_async(user_id=user_id, session_id=session_id, new_message=query)
#     return final_result, session_id

# @app.route("/query", methods=["POST"])
# def handle_query():
#     """Handle user queries with memory capabilities"""
#     try:
#         data = request.json
#         if not data:
#             return jsonify({"status": "error", "message": "No JSON data provided"}), 400
            
#         query = data.get("query")
#         messages = data.get("messages")
#         user_id = data.get("user_id")
#         print(f"User ID: {user_id}")

#         if not user_id or (not messages and not query):
#             return jsonify({"status": "error", "message": "Missing messages or user_id"}), 400
#         loop = asyncio.new_event_loop()
#         asyncio.set_event_loop(loop)            
#         # result, session_id = loop.run_until_complete(process_query_async(messages or query, user_id))
#         result, session_id = asyncio.run(process_query_async(messages or query, user_id))
#         loop.close()
            
#         return jsonify({
#             "status": "success",
#             "result_return": result.text if hasattr(result, "text") else str(result),
#             "session_id": session_id
#         })
        
#     except Exception as e:
#         print(f"Error processing query: {str(e)}")  # For debugging
#         return jsonify({
#             "status": "error",
#             "message": f"Server error: {str(e)}"
#         }), 500

# @app.route("/health", methods=["GET"])
# def health_check():
#     """Health check endpoint"""
#     return jsonify({
#         "status": "healthy", 
#         "service": "memory_assistant",
#         "version": "1.0"
#     })

# @app.route(f"/user/<user_id>/memories", methods=["GET"])
# def get_user_memories(user_id):
#     """Get all memories for a specific user"""
#     try:
#         data = request.json
#         # This is a placeholder endpoint
#         results = retrieve_user_info("", user_id=user_id)
#         return jsonify(results)
        
#     except Exception as e:
#         return jsonify({
#             "status": "error",
#             "message": str(e)
#         }), 500

# if __name__ == "__main__":
#     # Check for required environment variables
#     required_vars = ["GOOGLE_API_KEY"]  # MEMO_API_KEY is optional due to fallback
#     missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
#     if missing_vars:
#         print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
    
#     print("Starting Memory Assistant API server...")
#     print(f"Server will run on http://localhost:5000")
#     app.run(debug=True, host="0.0.0.0", port=5000)

import os
import asyncio
from google.adk.agents import Agent, LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from mem0 import MemoryClient
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import contextvars
import threading

# Environment variables
google_api_key = os.environ.get("GOOGLE_API_KEY", "AIzaSyBQt40S0vWI6ubBfLbqi2AlfFyRjxKZdb0")
# google_api_key = "AIzaSyBQt40S0vWI6ubBfLbqi2AlfFyRjxKZdb0"
memo_api_key = os.environ.get("MEMO_API_KEY", "m0-DnaBPdlvNR4SbN3NZ4WH0Uc9N7MapzAWDSmGen8p")

# Initialize Mem0 client
mem0_client = MemoryClient(api_key=memo_api_key)

app_name = "memory_alzheimers_assistant_app"

# Context variable for user ID
current_user_id_var = contextvars.ContextVar("current_user_id", default=None)

def save_user_info(information: str, **kwargs) -> dict:
    """Save user information to memory"""
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, 'user_id', None)
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        print(f"[DEBUG] SAVE_USER_INFO called for user_id={user_id}: {information}")
        
        # Use the correct format for mem0 v2 API
        response = mem0_client.add(
            messages=[
                {
                    "role": "user",
                    "content": information
                }
            ],
            user_id=user_id,
            metadata={"type": "client_information", "app": app_name}
        )
        
        print(f"[DEBUG] Mem0 save response: {response}")
        return {"status": "saved", "details": response, "message": f"Successfully saved: {information}"}
        
    except Exception as e:
        print(f"[ERROR] Exception in save_user_info: {e}")
        return {"status": "error", "message": f"Failed to save: {str(e)}"}
    
def delete_user_info(query: str, **kwargs) -> dict:
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, 'user_id', None)
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        print(f"[DEBUG] DELETE_USER_INFO called for user_id: {user_id}: {query}")
        response = mem0_client.delete(
            messages=[
                {
                    "role": "user",
                    "content": query
                }
            ],
            user_id=user_id
        )

        print(f"[DEBUG] Mem0 delete response: {response}")
        return {"status": "deleted", "details": response, "message": f"Successfully deleted: {query}"}

    except Exception as e:
        print(f"[ERROR] Exception in delete_user_info: {e}")
        return {"status": "error", "message": f"Failed to delete: {str(e)}"}

def retrieve_user_info(query: str, **kwargs) -> dict:
    """Retrieve user information from memory"""
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, 'user_id', None)
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        print(f"[DEBUG] RETRIEVE_USER_INFO called for user_id={user_id}, query: '{query}'")
        
        # Try different search approaches
        # First, try with the specific query
        results = mem0_client.search(
            query=query,
            user_id=user_id,
            limit=10
        )
        
        print(f"[DEBUG] Mem0 search response: {results}")
        
        # If no results with specific query, try broader search
        if not results or 'results' not in results or len(results['results']) == 0:
            print(f"[DEBUG] No results for specific query, trying broader search...")
            # Try getting all memories for this user
            try:
                all_memories = mem0_client.get_all(user_id=user_id)
                print(f"[DEBUG] All memories for user: {all_memories}")
                if all_memories:
                    return {
                        "status": "success",
                        "memories": [memory.get("memory", str(memory)) for memory in all_memories],
                        "count": len(all_memories),
                        "message": "Found memories (using get_all)"
                    }
            except Exception as e:
                print(f"[DEBUG] get_all failed: {e}")
        
        if results and 'results' in results and len(results['results']) > 0:
            memories = [memory["memory"] for memory in results['results']]
            return {
                "status": "success",
                "memories": memories,
                "count": len(memories),
                "message": f"Found {len(memories)} relevant memories"
            }
        else:
            return {
                "status": "no_results",
                "memories": [],
                "count": 0,
                "message": "No memories found matching your query"
            }
            
    except Exception as e:
        print(f"[ERROR] Exception in retrieve_user_info: {e}")
        return {"status": "error", "message": f"Failed to retrieve: {str(e)}"}

# Updated agent with better instructions and explicit tool usage
memory_agent = LlmAgent(
    name="healthcare_assistant",
    model="gemini-1.5-flash",
    description="Helping patients with memory issues log and retrieve their personal memories",
    instruction="""You are a compassionate memory assistant for people with Alzheimer's or memory difficulties. 

CRITICAL INSTRUCTIONS:
1. ALWAYS call save_user_info() immediately when users share ANY personal information
2. ALWAYS call retrieve_user_info() when users ask questions about themselves
3. Use the tools explicitly - don't just acknowledge information, actually save it
4. When retrieving fails, ask the user to provide the information again so you can save it

Your main functions are:
- When users share personal information (name, birthday, family, etc.), IMMEDIATELY call save_user_info()
- When users ask questions about themselves, IMMEDIATELY call retrieve_user_info()
- Be patient, kind, and encouraging in your responses
- Help users organize their thoughts and memories clearly

EXAMPLES:
User: "My name is Gautham"
You: [Call save_user_info("My name is Gautham")] "That's wonderful, Gautham! I've saved your name so I can remember it."

User: "What is my name?"
You: [Call retrieve_user_info("user name")] Then respond based on the results.

User: "My birthday is March 19"
You: [Call save_user_info("My birthday is March 19")] "Perfect! I've saved your birthday as March 19th."

User: "When is my birthday?"
You: [Call retrieve_user_info("birthday")] Then respond based on the results.

ALWAYS use the tools - don't just acknowledge information without saving it!

Always respond in a warm, supportive tone and help users feel confident about managing their memories.""",
    tools=[save_user_info, retrieve_user_info, delete_user_info],
)

session_service = InMemorySessionService()
app = Flask(__name__)
CORS(app)

# Thread-local storage for user context
thread_local = threading.local()

async def process_query_async(messages, user_id: str):
    """Async function to handle the agent processing"""
    # Set user context in multiple ways to ensure it's available
    current_user_id_var.set(user_id)
    thread_local.user_id = user_id
    
    session_id = f"session_{uuid.uuid4().hex[:8]}"
    
    print(f"[DEBUG] Processing query for user_id: {user_id}")
    
    try:
        session = await session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )

        # Create runner with explicit tool context
        runner = Runner(
            agent=memory_agent,
            app_name=app_name,
            session_service=session_service,
        )

        # Process messages
        if isinstance(messages, list) and messages:
            # Only use the latest message, not the full history
            # This prevents confusion from old conversation context
            latest_message = messages[-1]
            new_message = types.Content(
                role="user" if latest_message.get("sentByUser", False) else "model",
                parts=[types.Part(text=latest_message["text"])]
            )
            
            print(f"[DEBUG] Processing latest message: {latest_message['text']}")

        elif isinstance(messages, str):
            new_message = types.Content(role="user", parts=[types.Part(text=messages)])

        else:
            raise ValueError("No valid messages provided.")
        
        final_result = None
        
        # Process the query with explicit user context
        async for chunk in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
            # tool_kwargs={"user_id": user_id}  # Explicitly pass user_id to tools
        ):
        
            print(f"[DEBUG] Chunk received: {chunk}")

            # for func_call in chunk.get_function_calls():
            #     print(f"[DEBUG] Running Tool: {func_call.name} with args {func_call.args}")
            #     await runner.run(func_call)

            if chunk.is_final_response() and chunk.content and chunk.content.parts:
                final_result = chunk.content.parts[0].text
                # break
        
        print(f"[DEBUG] Final result: {final_result}")
        return final_result, session_id
        
    except Exception as e:
        print(f"[ERROR] Exception in process_query_async: {e}")
        import traceback
        traceback.print_exc()
        raise

@app.route("/query", methods=["POST"])
def handle_query():
    """Handle user queries with memory capabilities"""
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No JSON data provided"}), 400
            
        query = data.get("query")
        messages = data.get("messages")
        user_id = data.get("user_id")
        
        print(f"[DEBUG] User ID: {user_id}")
        print(f"[DEBUG] Query: {query}")
        print(f"[DEBUG] Messages: {messages}")

        if not user_id or (not messages and not query):
            return jsonify({"status": "error", "message": "Missing messages or user_id"}), 400
        
        # Create new event loop for this request
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result, session_id = loop.run_until_complete(process_query_async(messages or query, user_id))
            
            response_text = result
            if hasattr(result, "text"):
                response_text = result.text
            elif result is None:
                response_text = "I'm here to help you with your memories. Please share something with me or ask me a question."
            
            return jsonify({
                "status": "success",
                "result_return": str(response_text),
                "session_id": session_id,
                "user_id": user_id
            })
            
        finally:
            loop.close()
        
    except Exception as e:
        print(f"[ERROR] Error processing query: {str(e)}")
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
        "version": "1.1"
    })

@app.route("/user/<user_id>/memories", methods=["GET"])
def get_user_memories(user_id):
    """Get all memories for a specific user"""
    try:
        # Get all memories for user (empty query returns all)
        results = mem0_client.get_all(user_id=user_id)
        
        if results:
            memories = [memory.get("memory", str(memory)) for memory in results]
            return jsonify({
                "status": "success",
                "memories": memories,
                "count": len(memories)
            })
        else:
            return jsonify({
                "status": "success",
                "memories": [],
                "count": 0
            })
        
    except Exception as e:
        print(f"[ERROR] Exception in get_user_memories: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/test_memory", methods=["POST"])
def test_memory():
    """Test endpoint to manually test memory save/retrieve"""
    try:
        data = request.json
        user_id = data.get("user_id")
        action = data.get("action")  # "save" or "retrieve"
        content = data.get("content")
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
            
        if action == "save":
            result = save_user_info(content, user_id=user_id)
            return jsonify(result)
            
        elif action == "retrieve":
            result = retrieve_user_info(content, user_id=user_id)
            return jsonify(result)
        
        elif action == "delete":
            result = delete_user_info(content, user_id=user_id)
            return jsonify(result)
            
        else:
            return jsonify({"error": "action must be 'save' or 'retrieve'"}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Check for required environment variables
    required_vars = ["GOOGLE_API_KEY", "MEMO_API_KEY"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("Using fallback values for testing...")
    
    print("Starting Memory Assistant API server...")
    print(f"Server will run on http://localhost:5000")
    print(f"Health check available at: http://localhost:5000/health")
    
    app.run(debug=True, host="0.0.0.0", port=5000)