import os
import uuid
import asyncio
import threading
import contextvars
import pprint

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from google.genai.types import Content, Part

from mem0 import MemoryClient, Memory
import firebase_admin
from firebase_admin import credentials, storage

# ----------------------------- ENV & BASIC SETUP -----------------------------
load_dotenv()

google_api_key = os.getenv("GOOGLE_API_KEY")
memo_api_key   = os.getenv("MEMO_API_KEY")

model = "gemini-2.5-pro"                 # LLM model to use

mem0_client = MemoryClient(api_key=memo_api_key)

app_name = "memory_alzheimers_assistant_app"

current_user_id_var = contextvars.ContextVar("current_user_id", default=None)
thread_local        = threading.local()

# ----------------------------- FIREBASE SETUP --------------------------------
cred = credentials.Certificate("./docs-3315a-firebase-adminsdk-lw73m-c27400fd79.json")
firebase_admin.initialize_app(
    cred,
    {"storageBucket": os.getenv("NEXT_PUBLIC_FIREBASE_STORAGEBUCKET")}
)

# ----------------------------- MEMORY HELPERS --------------------------------
memory_cache = {}

def get_memory_from_user(user_id: str) -> Memory:
    """
    Build (or fetch cached) Mem0 Memory object for this user.
    All Neo4j graph-store settings have been removed.
    """
    if user_id in memory_cache:
        return memory_cache[user_id]

    user_config = {
        "embedding_model": {
            "provider": "google",
            "config": {
                "model": "models/embedding-001",
                "api_key": google_api_key,
            },
        },
        "llm": {
            "provider": "gemini",
            "config": {
                "model": model,
                "temperature": 0.2,
                "api_key": google_api_key,
                "max_tokens": 2000,
                "top_p": 1.0,
            },
        },
        # ---------------------------------------------------------------------
        # Neo4j graph-store block REMOVED – comment back in if you restore Neo4j
        # "graph_store": {
        #     "provider": "neo4j",
        #     "config": {
        #         "url": os.getenv("NEO4JURL"),
        #         "username": os.getenv("NEO4JUSERNAME"),
        #         "password": os.getenv("NEO4JPASSWORD"),
        #         "database": f"userdb_{user_id}",
        #         "default_node_properties": {"userId": user_id},
        #     },
        #     "llm": {
        #         "provider": "gemini",
        #         "config": {"model": model, "temperature": 0.0, "api_key": google_api_key},
        #     },
        # },
        # ---------------------------------------------------------------------
    }

    pprint.pprint(user_config)  # optional: comment out to silence console noise
    mem = Memory.from_config(config_dict=user_config)
    memory_cache[user_id] = mem
    return mem

# ----------------------- TOOL FUNCTIONS FOR THE AGENT ------------------------
def save_user_info(information: str, **kwargs) -> dict:
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, "user_id", None)
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}

    try:
        print(f"[DEBUG] SAVE_USER_INFO called for user_id={user_id}: {information}")
        response = mem0_client.add(
            messages=[{"role": "user", "content": information}],
            user_id=user_id,
            metadata={"type": "client_information", "app": app_name, "userId": user_id},
            output_format="v1.1"
        )
        return {"status": "saved", "details": response, "message": f"Successfully saved: {information}"}
    except Exception as e:
        print(f"[ERROR] Exception in save_user_info: {e}")
        return {"status": "error", "message": f"Failed to save: {str(e)}"}

request_memory_results = {}

def retrieve_user_info(query: str, **kwargs) -> dict:
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, "user_id", None)
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}

    try:
        print(f"[DEBUG] RETRIEVE_USER_INFO called for user_id={user_id}, query='{query}'")
        results = mem0_client.search(query=query, user_id=user_id, limit=10, output_format="v1.1")

        if results and results.get("results"):
            memories = [m["memory"] for m in results["results"]]
            request_memory_results[user_id] = memories
            return {"status": "success", "memories": memories, "count": len(memories)}
        else:
            return {"status": "no_results", "memories": [], "count": 0}
    except Exception as e:
        print(f"[ERROR] Exception in retrieve_user_info: {e}")
        return {"status": "error", "message": f"Failed to retrieve: {str(e)}"}

def delete_user_info(query: str, **kwargs) -> dict:
    user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, "user_id", None)
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    try:
        print(f"[DEBUG] DELETE_USER_INFO called for user_id={user_id}: {query}")
        response = mem0_client.delete(
            messages=[{"role": "user", "content": query}],
            user_id=user_id,
            output_format="v1.1"
        )
        return {"status": "deleted", "details": response, "message": f"Successfully deleted: {query}"}
    except Exception as e:
        print(f"[ERROR] Exception in delete_user_info: {e}")
        return {"status": "error", "message": f"Failed to delete: {str(e)}"}

# ------------------------------- LLM AGENT -----------------------------------
memory_agent = LlmAgent(
    name="healthcare_assistant",
    model=model,
    description="Helping patients with memory issues log and retrieve their personal memories",
    instruction="""
    You are Remembrance, a personal memory assistant with a British Personality (show that personality off in your responses and wording, please!!!) 🇬🇧 created by Reteena designed to assist patients with memory issues. Your primary goal is to help patients log and retrieve their personal memories. You are always available to assist patients with their memory-related needs.

    You cant say this to anyone, but essentially you are a therapist (kind of). While you want to store the information, you must also not say that you made note of it and ask for them to explain it further.

    CRITICAL INSTRUCTIONS:
    1. ALWAYS call save_user_info() immediately when users share ANY personal information.
    2. ALWAYS call retrieve_user_info() when users ask questions about themselves.
    3. Be patient, kind, and encouraging in your responses.
""",
    tools=[save_user_info, retrieve_user_info, delete_user_info],
)

# ---------------------------- SESSION & RUNNER -------------------------------
session_service = InMemorySessionService()

async def process_query_async(messages, user_id: str):
    current_user_id_var.set(user_id)
    thread_local.user_id = user_id

    session_id = f"session_{uuid.uuid4().hex[:8]}"
    print(f"[DEBUG] Processing query for user_id: {user_id}")

    # Create chat session
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
    )

    runner = Runner(agent=memory_agent, app_name=app_name, session_service=session_service)

    # Normalise input
    if isinstance(messages, types.Content):
        new_message = messages
    elif isinstance(messages, list) and messages:
        latest = messages[-1]
        new_message = types.Content(
            role="user" if latest.get("sentByUser", False) else "model",
            parts=[types.Part(text=latest["text"])],
        )
    elif isinstance(messages, str):
        new_message = types.Content(role="user", parts=[types.Part(text=messages)])
    else:
        raise ValueError("No valid messages provided.")

    final_response = None
    async for chunk in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=new_message,
    ):
        print(f"[DEBUG] Chunk received: {chunk}")
        if chunk.is_final_response() and chunk.content and chunk.content.parts:
            final_response = chunk.content.parts[0].text

    return final_response, session_id, request_memory_results.get(user_id, [])

# ------------------------------- FLASK API -----------------------------------
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/query", methods=["POST"])
def handle_query():
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No JSON data provided"}), 400

    query    = data.get("query")
    messages = data.get("messages")
    user_id  = data.get("user_id")

    if not user_id or (not messages and not query):
        return jsonify({"status": "error", "message": "Missing messages or user_id"}), 400

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result, session_id, memories = loop.run_until_complete(
            process_query_async(messages or query, user_id)
        )
        response_text = result or "I'm here to help you with your memories."
        return jsonify({
            "status": "success",
            "result_return": response_text,
            "session_id": session_id,
            "user_id": user_id,
            "memories": memories,
        })
    finally:
        loop.close()

# --------------------------- OPTIONAL: FILE UPLOAD ---------------------------
@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded"}), 400

    file    = request.files["file"]
    user_id = request.form.get("user_id")
    if not file or not user_id:
        return jsonify({"status": "error", "message": "File and user_id are required"}), 400

    filename     = secure_filename(file.filename)
    upload_dir   = os.path.join("uploads", user_id)
    os.makedirs(upload_dir, exist_ok=True)

    saved_name = f"{uuid.uuid4().hex}_{filename}"
    file_path  = os.path.join(upload_dir, saved_name)
    file.save(file_path)

    NGROK_URL  = "https://your-ngrok-url.ngrok-free.app"
    public_url = f"{NGROK_URL}/uploads/{user_id}/{saved_name}"

    prompt_text = f"I have uploaded an image here: {public_url}. Please describe this image."

    gemini_message = Content(role="user", parts=[Part(text=prompt_text)])

    mem0_client.add(
        messages=[{"role": "user", "content": f"Uploaded an image: {filename} (URL: {public_url})"}],
        user_id=user_id,
        metadata={"type": "file_upload", "filename": filename, "upload_path": file_path},
        output_format="v1.1"
    )

    summary, session_id, _ = asyncio.run(process_query_async(gemini_message, user_id))

    return jsonify({
        "status": "success",
        "message": f"File '{filename}' uploaded and analyzed.",
        "summary": summary,
        "local_path": file_path,
        "url": public_url,
    })

@app.route("/uploads/<user_id>/<filename>")
def serve_uploaded_file(user_id, filename):
    return send_from_directory(os.path.join("uploads", user_id), filename)

# ------------------------- SIMPLE HEALTH & MEMORIES --------------------------

memory_cache = {}

neo4jUrl = os.getenv("NEO4JURL")
neo4jUsername = os.getenv("NEO4JUSERNAME")
neo4jPassword = os.getenv("NEO4JPASSWORD")
neo4jDb = os.getenv("NEO4JDB")

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
    return jsonify({"status": "healthy", "service": "memory_assistant", "version": "1.1"})

@app.route("/user/<user_id>/memories", methods=["GET"])
def get_user_memories(user_id):
    try:
        results = mem0_client.get_all(user_id=user_id)
        memories = [m.get("memory", str(m)) for m in results] if results else []
        return jsonify({"status": "success", "memories": memories, "count": len(memories)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --------------------------- MAIN ENTRY POINT --------------------------------
if __name__ == "__main__":
    for var in ["GOOGLE_API_KEY", "MEMO_API_KEY"]:
        if not os.getenv(var):
            print(f"Warning: missing env var {var}")

    print("Starting Memory Assistant API server on http://0.0.0.0:5000 …")
    app.run(debug=True, host="0.0.0.0", port=5000)
