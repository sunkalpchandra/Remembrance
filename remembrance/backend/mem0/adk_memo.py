import os
import asyncio
from google.adk.agents import Agent, LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from mem0 import MemoryClient, Memory
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import contextvars
import threading
import pprint
# import openai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import firebase_admin
from firebase_admin import credentials, storage

load_dotenv()

# print(f"OPENAI Client: {openai}")

# Environment variables
os.environ.get("OPENAI_API_KEY") # need to replace this, they default to openai for graph so I had to instatiate this (to get rid of the error for not parsing through gemini, soem underlying feature in Mem0 relies on Openai instead of specific LLM provider)
google_api_key = os.getenv("GOOGLE_API_KEY")
memo_api_key = os.getenv("MEMO_API_KEY")

# Initialize Mem0 client
mem0_client = MemoryClient(api_key=memo_api_key)

app_name = "memory_alzheimers_assistant_app"

current_user_id_var = contextvars.ContextVar("current_user_id", default=None)

# firebase initialization
cred = credentials.Certificate("./docs-3315a-firebase-adminsdk-lw73m-c27400fd79.json")
firebase_admin.initialize_app(cred, {
    "storageBucket": os.getenv("NEXT_PUBLIC_FIREBASE_STORAGEBUCKET")
})

def save_user_info(information: str, **kwargs) -> dict:
    """Save user information to memory"""
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, 'user_id', None)
    memory = get_memory_from_user(user_id)
    
    if information:
        return memory.add(information, user_id=user_id)

    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        print(f"[DEBUG] SAVE_USER_INFO called for user_id={user_id}: {information}")
        
        response = mem0_client.add(
            messages=[
                {
                    "role": "user",
                    "content": information
                }
            ],
            user_id=user_id,
            metadata={"type": "client_information", "app": app_name, "userId": user_id}
        )
        
        print(f"[DEBUG] Mem0 save response: {response}")
        return {"status": "saved", "details": response, "message": f"Successfully saved: {information}"}
        
    except Exception as e:
        print(f"[ERROR] Exception in save_user_info: {e}")
        return {"status": "error", "message": f"Failed to save: {str(e)}"}
    
def delete_user_info(query: str, **kwargs) -> dict:
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, 'user_id', None)
    memory = get_memory_from_user(user_id)
    if query:
        memory.delete(query)
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
    
request_memory_results = {}

def retrieve_user_info(query: str, **kwargs) -> dict:
    """Retrieve user information from memory"""
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, 'user_id', None)
    memory = get_memory_from_user(user_id)
    if query:
        memory.search(query, user_id=user_id)

    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    
    try:
        print(f"[DEBUG] RETRIEVE_USER_INFO called for user_id={user_id}, query: '{query}'")
        
        # Try different search approaches
        results = mem0_client.search(
            query=query,
            user_id=user_id,
            limit=10
        )
        
        print(f"[DEBUG] Mem0 search response: {results}")
        
        if not results or 'results' not in results or len(results['results']) == 0:
            print(f"[DEBUG] No results for specific query, trying broader search...")
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
            request_memory_results[user_id] = memories
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
    
memory_cache = {}

neo4jUrl = os.getenv("NEO4JURL")
neo4jUsername = os.getenv("NEO4JUSERNAME")
neo4jPassword = os.getenv("NEO4JPASSWORD")
neo4jDb = os.getenv("NEO4JDB")
    
def get_memory_from_user(user_id: str) -> Memory:
    if user_id in memory_cache:
        return memory_cache[user_id]
    
    user_config = {
        "embedding_model": {
            "provider": "google",
            "config": {
                "model": "models/embedding-001",
                "api_key": google_api_key
            }
        },
        "llm": {
            "provider": "gemini",
            "config": {
                "model": "gemini-2.0-flash-lite-001",
                "temperature": 0.2,
                "api_key": google_api_key,
                "max_tokens": 2000,
                "top_p": 1.0,
            }
        },
        "graph_store": {
            "provider": "neo4j",
            "config": {
                "url": neo4jUrl,
                "username": neo4jUsername,
                "password": neo4jPassword,
                "database": f"userdb_{user_id}",
                "default_node_properties": {
                    "userId": user_id
                }
            },
            "llm" : {
                "provider": "gemini",
                "config": {
                    "model": "gemini-2.0-flash-lite-001",
                    "temperature": 0.0,
                    "api_key": google_api_key,   
                }
            }
        },
        # "vector_store": {
        #     "provider": "qdrant",
        #     "config": {
        #         "path": f"./temp/qdrant_{user_id}"
        #     }
        # }
    }

    pprint.pprint(user_config)

    mem = Memory.from_config(config_dict=user_config)
    return mem

# TODO: Fix system prompt
memory_agent = LlmAgent(
    name="healthcare_assistant",
    model="gemini-2.0-flash-lite-001",
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
CORS(app, resources={r"/*": {"origins": "*"}})

thread_local = threading.local()

async def process_query_async(messages, user_id: str):
    """Async function to handle the agent processing"""
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

        runner = Runner(
            agent=memory_agent,
            app_name=app_name,
            session_service=session_service
        )

        if isinstance(messages, list) and messages:
            # Only use the latest message, not the full history
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
        
        async for chunk in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
            # tool_kwargs={"user_id": user_id} 
        ):
        
            print(f"[DEBUG] Chunk received: {chunk}")

            # for func_call in chunk.get_function_calls():
            #     print(f"[DEBUG] Running Tool: {func_call.name} with args {func_call.args}")
            #     await runner.run(func_call)

            if chunk.is_final_response() and chunk.content and chunk.content.parts:
                final_result = chunk.content.parts[0].text
                # break

        memories = request_memory_results.get(user_id, [])
        
        print(f"[DEBUG] Final result: {final_result}")
        return final_result, session_id, memories
            
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
            # result, session_id = loop.run_until_complete(process_query_async(messages or query, user_id))
            result, session_id, memories = asyncio.run(process_query_async(messages or query, user_id))
            response_text = result
            if hasattr(result, "text"):
                response_text = result.text
            elif result is None:
                response_text = "I'm here to help you with your memories. Please share something with me or ask me a question."
            
            return jsonify({
                "status": "success",
                "result_return": str(response_text),
                "session_id": session_id,
                "user_id": user_id,
                "memories": memories
            })
            
        finally:
            loop.close()
        
    except Exception as e:
        print(f"[ERROR] Error processing query: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Server error: {str(e)}"
        }), 500
    
def safe_dict(items):
    result = {}
    for k, v in items:
        if isinstance(v, (str, int, float, bool)) or v is None:
            result[k] = v
        else:
            result[k] = str(v)

    return result

@app.route("/user/<user_id>/graph", methods=["GET"])
def get_user_graph(user_id: str):
    from neo4j import GraphDatabase

    uri = neo4jUrl
    username = neo4jUsername
    password = neo4jPassword
    database = neo4jDb

    try:
        with GraphDatabase.driver(uri=uri, auth=(username, password)) as driver:
            with driver.session(database=database) as session:

                query = """
                MATCH (u:User {userId: $user_id})-[:HAS_MEMORY]->(m:Memory)
                RETURN u, m
                """

                results = session.run(query, user_id=user_id)
                graph = {"nodes": [], "links": []}
                seen_nodes = set()

                for record in results:
                    user_node = record["u"]
                    mem_node = record["m"]

                    # Add user node if not seen
                    user_id_str = str(user_node.id)
                    if user_id_str not in seen_nodes:
                        graph["nodes"].append({
                            "id": user_id_str,
                            "label": user_node.get("name", "User"),
                            "properties": safe_dict(user_node.items())
                        })
                        seen_nodes.add(user_id_str)

                    # Add memory node if not seen
                    mem_id_str = str(mem_node.element_id)
                    if mem_id_str not in seen_nodes:
                        graph["nodes"].append({
                            "id": mem_id_str,
                            "label": mem_node.get("summary", mem_node.get("content", "Memory"))[:20],
                            "properties": safe_dict(mem_node.items())
                        })
                        seen_nodes.add(mem_id_str)

                    # Add link from user to memory
                    graph["links"].append({
                        "source": user_id_str,
                        "target": mem_id_str,
                        "type": "HAS_MEMORY"
                    })

                return jsonify(graph)

    except Exception as e:
        print(f"[ERROR] in /graph: {e}")
        return jsonify({"error": str(e)}), 500


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

@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file uploaded"}), 400
        
        file = request.files["file"]
        user_id = request.form.get("user_id")

        if not file or not user_id:
            return jsonify({"status": "error", "message": "File and user_id are required"}), 400
        
        filename = secure_filename(file.filename)
        blob_path = f"user_uploads/{user_id}_{uuid.uuid4().hex}_{filename}"

        bucket = storage.bucket()
        blob = bucket.blob(blob_path)
        blob.upload_from_file(file.stream, content_type=file.content_type)

        blob.make_public() # change later

        mem_response = mem0_client.add(
            messages=[
                {
                    "role": "user",
                    "content": f"Uploaded a file: {filename} (URL: {blob.publicurl})"
                }
            ],
            user_id=user_id,
            metadata={"type": "file_upload", "filename": filename, "firebase_path": blob_path}
        )

        return jsonify({
            "status": "success",
            "message": f"File '{filename}' uploaded and proccessed",
            "memory_result": mem_response
        })
        
    except Exception as e:
        print(f"[ERROR] in /upload: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

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
    required_vars = ["GOOGLE_API_KEY", "MEMO_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("Using fallback values for testing...")
    
    print("Starting Memory Assistant API server...")
    print(f"Server will run on http://localhost:5000")
    print(f"Health check available at: http://localhost:5000/health")
    
    app.run(debug=True, host="0.0.0.0", port=5000)