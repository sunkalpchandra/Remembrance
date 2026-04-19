"""
Hi, I'm Goku!
"""

import asyncio
import contextvars
import os
import pprint
import threading
import uuid

from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    jsonify,
    request,
    send_from_directory,
    stream_with_context,
)
from flask_cors import CORS
from flask_sock import Sock
from google import genai
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from google.genai.types import Content, Part
from mem0 import Memory, MemoryClient
from prompt import SYSTEM_PROMPT
from werkzeug.utils import secure_filename

# import firebase_admin
# from firebase_admin import credentials, storage

# ----------------------------- ENV & BASIC SETUP -----------------------------
load_dotenv()

google_api_key = os.getenv("GOOGLE_API_KEY")
memo_api_key = os.getenv("MEM0_API_KEY") or os.getenv("MEMO_API_KEY")
# openai.api_key = os.getenv("OPENAI_API_KEY")

model = "gemini-2.5-flash"  # LLM model to use

mem0_client = MemoryClient(api_key=memo_api_key)

novel_client = genai.Client(api_key=google_api_key)

app_name = "memory_alzheimers_assistant_app"

current_user_id_var = contextvars.ContextVar("current_user_id", default=None)
thread_local = threading.local()

# ----------------------------- FIREBASE SETUP --------------------------------
# TODO: Add Firebase credentials file to enable Firebase functionality
# cred = credentials.Certificate("./docs-3315a-firebase-adminsdk-lw73m-c27400fd79.json")
# firebase_admin.initialize_app(
#     cred,
#     {"storageBucket": os.getenv("NEXT_PUBLIC_FIREBASE_STORAGEBUCKET")}
# )

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
    }

    neo4j_url = os.getenv("NEO4J_URL") or os.getenv("NEO4JURL")
    neo4j_user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4JUSERNAME")
    neo4j_pass = os.getenv("NEO4J_PASSWORD") or os.getenv("NEO4JPASSWORD")
    neo4j_db = os.getenv("NEO4J_DATABASE") or os.getenv("NEO4JDB") or "neo4j"

    if neo4j_url and neo4j_user and neo4j_pass:
        user_config["graph_store"] = {
            "provider": "neo4j",
            "config": {
                "url": neo4j_url,
                "username": neo4j_user,
                "password": neo4j_pass,
                "database": neo4j_db,
                "default_node_properties": {"userId": user_id},
            },
            "llm": {
                "provider": "gemini",
                "config": {
                    "model": model,
                    "temperature": 0.0,
                    "api_key": google_api_key,
                },
            },
        }

    mem = Memory.from_config(config_dict=user_config)
    memory_cache[user_id] = mem
    return mem


def test_neo4j_connection(user_id: str):
    try:
        memory = get_memory_from_user(user_id=user_id)

        # Test with a simple message
        test_result = memory.add(
            messages=[{"role": "user", "content": "Test message for Neo4j connection"}],
            user_id=user_id,
        )
        print(f"[DEBUG] Neo4j test successful: {test_result}")
        return True
    except Exception as e:
        print(f"[ERROR] Neo4j test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


# ----------------------- TOOL FUNCTIONS FOR THE AGENT ------------------------
# def save_user_info(information: str, **kwargs) -> dict:
#     user_id = kwargs.get("user_id") or current_user_id_var.get() or getattr(thread_local, "user_id", None)
#     if not user_id:
#         return {"status": "error", "message": "user_id is missing"}

#     try:
#         print(f"[DEBUG] SAVE_USER_INFO called for user_id={user_id}: {information}")
#         response = mem0_client.add(
#             messages=[{"role": "user", "content": information}],
#             user_id=user_id,
#             metadata={"type": "client_information", "app": app_name, "userId": user_id},
#             output_format="v1.1"
#         )

#         memory = get_memory_from_user(user_id=user_id)
#         memory.save(information)

#         return {"status": "saved", "details": response, "message": f"Successfully saved: {information}"}
#     except Exception as e:
#         print(f"[ERROR] Exception in save_user_info: {e}")
#         return {"status": "error", "message": f"Failed to save: {str(e)}"}


def save_user_info(information: str, **kwargs) -> dict:
    user_id = (
        kwargs.get("user_id")
        or current_user_id_var.get()
        or getattr(thread_local, "user_id", None)
    )
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}

    try:
        print(f"[DEBUG] SAVE_USER_INFO called for user_id={user_id}: {information}")

        # Save to Mem0 cloud
        response = mem0_client.add(
            messages=[{"role": "user", "content": information}],
            user_id=user_id,
            metadata={"type": "client_information", "app": app_name, "userId": user_id},
            output_format="v1.1",
        )

        # Save to local Neo4j
        try:
            memory = get_memory_from_user(user_id=user_id)
            neo4j_result = memory.save(information)
            print(f"[DEBUG] Neo4j save result: {neo4j_result}")
        except Exception as neo4j_error:
            print(f"[ERROR] Neo4j save failed: {neo4j_error}")
            # Continue execution - don't fail the whole function

        return {
            "status": "saved",
            "details": response,
            "message": f"Successfully saved: {information}",
        }
    except Exception as e:
        print(f"[ERROR] Exception in save_user_info: {e}")
        return {"status": "error", "message": f"Failed to save: {str(e)}"}


request_memory_results = {}


def retrieve_user_info(query: str, **kwargs) -> dict:
    user_id = (
        kwargs.get("user_id")
        or current_user_id_var.get()
        or getattr(thread_local, "user_id", None)
    )
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}

    try:
        print(
            f"[DEBUG] RETRIEVE_USER_INFO called for user_id={user_id}, query='{query}'"
        )
        results = mem0_client.search(
            query=query, user_id=user_id, limit=10, output_format="v1.1"
        )

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
    user_id = (
        kwargs.get("user_id")
        or current_user_id_var.get()
        or getattr(thread_local, "user_id", None)
    )
    if not user_id:
        return {"status": "error", "message": "user_id is missing"}
    try:
        print(f"[DEBUG] DELETE_USER_INFO called for user_id={user_id}: {query}")
        response = mem0_client.delete(
            messages=[{"role": "user", "content": query}],
            user_id=user_id,
            output_format="v1.1",
        )
        return {
            "status": "deleted",
            "details": response,
            "message": f"Successfully deleted: {query}",
        }
    except Exception as e:
        print(f"[ERROR] Exception in delete_user_info: {e}")
        return {"status": "error", "message": f"Failed to delete: {str(e)}"}


# ------------------------------- LLM AGENT -----------------------------------
memory_agent = LlmAgent(
    name="healthcare_assistant",
    model=model,
    description="Helping patients with memory issues log and retrieve their personal memories",
    instruction=SYSTEM_PROMPT,
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

    runner = Runner(
        agent=memory_agent, app_name=app_name, session_service=session_service
    )

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
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers="*",
    methods=["GET", "POST", "OPTIONS"],
)


try:
    sock = Sock(app)
except NameError:
    sock = Sock()


@app.route("/query", methods=["POST"])
def handle_query():
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No JSON data provided"}), 400

    query = data.get("query")
    messages = data.get("messages")
    user_id = data.get("user_id")

    if not user_id or (not messages and not query):
        return jsonify(
            {"status": "error", "message": "Missing messages or user_id"}
        ), 400

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result, session_id, memories = loop.run_until_complete(
            process_query_async(messages or query, user_id)
        )
        response_text = result or "I'm here to help you with your memories."
        return jsonify(
            {
                "status": "success",
                "result_return": response_text,
                "session_id": session_id,
                "user_id": user_id,
                "memories": memories,
            }
        )
    finally:
        loop.close()


MEM0_SEARCH_TIMEOUT_S = 1.5  # never block streaming on a slow Mem0 lookup


def _format_profile(profile: dict) -> str:
    if not profile:
        return ""
    parts = []
    name = profile.get("patientName")
    age = profile.get("age")
    if name:
        parts.append(f"Patient name: {name}" + (f" (age {age})" if age else ""))
    family = profile.get("family") or []
    if family:
        fam_str = ", ".join(
            f"{f.get('name')} ({f.get('relation')})" for f in family if f.get("name")
        )
        if fam_str:
            parts.append(f"Family: {fam_str}")
    places = profile.get("places") or []
    if places:
        parts.append(f"Important places: {', '.join(places)}")
    notes = profile.get("notes")
    if notes:
        parts.append(f"Notes: {notes}")
    return "\n".join(parts)


@app.route("/query/stream", methods=["POST"])
def handle_query_stream():
    import json as json_mod

    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No JSON data provided"}), 400

    messages = data.get("messages") or []
    user_id = data.get("user_id")
    profile = data.get("profile") or {}

    if not user_id or not messages:
        return jsonify(
            {"status": "error", "message": "Missing messages or user_id"}
        ), 400

    latest_msg = (
        messages[-1].get("text", "") if isinstance(messages, list) and messages else ""
    )
    profile_block = _format_profile(profile)

    # Kick off Mem0 search in parallel; we'll join with a tight timeout
    mem_holder = {"memories": []}

    def _search():
        try:
            res = mem0_client.search(
                query=latest_msg, user_id=user_id, limit=8, output_format="v1.1"
            )
            mem_holder["memories"] = [m["memory"] for m in (res.get("results") or [])]
        except Exception as e:
            print(f"[WARN] mem0 search failed: {e}")

    search_thread = threading.Thread(target=_search, daemon=True)
    search_thread.start()
    search_thread.join(timeout=MEM0_SEARCH_TIMEOUT_S)
    memories = mem_holder["memories"]

    context_parts = []
    if profile_block:
        context_parts.append(f"Identity context:\n{profile_block}")
    if memories:
        context_parts.append(
            "Relevant past memories:\n" + "\n".join(f"- {m}" for m in memories)
        )
    context = (
        "\n\n".join(context_parts)
        if context_parts
        else "No prior context yet — this is an early conversation."
    )

    def generate():
        collected = []
        # Try primary model, fall back to 2.0-flash if overloaded (503)
        models_to_try = [model, "gemini-2.5-flash"]
        last_err = None
        for attempt_model in models_to_try:
            collected = []
            try:
                stream = novel_client.models.generate_content_stream(
                    model=attempt_model,
                    contents=f"{context}\n\nUser said: {latest_msg}",
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT
                    ),
                )
                for chunk in stream:
                    if chunk.text:
                        collected.append(chunk.text)
                        yield f"data: {json_mod.dumps({'text': chunk.text})}\n\n"
                last_err = None
                break  # success
            except Exception as e:
                last_err = e
                err_str = str(e)
                print(f"[WARN] model {attempt_model} failed: {err_str[:120]}")
                # Retry on overloaded (503) or quota-exhausted (429) — other models have separate quotas
                retryable = (
                    any(
                        tok in err_str
                        for tok in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED")
                    )
                    or "overloaded" in err_str.lower()
                    or "quota" in err_str.lower()
                )
                if not retryable:
                    break
        if last_err is not None and not collected:
            yield f"data: {json_mod.dumps({'error': str(last_err)})}\n\n"
            return

        yield f"data: {json_mod.dumps({'done': True, 'memories': memories})}\n\n"

        full_text = "".join(collected)

        def save_mem():
            try:
                mem0_client.add(
                    messages=[
                        {"role": "user", "content": latest_msg},
                        {"role": "assistant", "content": full_text},
                    ],
                    user_id=user_id,
                    output_format="v1.1",
                )
            except Exception as e:
                print(f"[WARN] mem0 save failed: {e}")

        threading.Thread(target=save_mem, daemon=True).start()

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@sock.route("/query/ws")
def handle_query_ws(ws):
    import json as json_mod

    while True:
        data = ws.receive()
        if not data:
            break
        req = json_mod.loads(data)
        messages = req.get("messages") or []
        user_id = req.get("user_id")
        profile = req.get("profile") or {}

        if not user_id or not messages:
            ws.send(
                json_mod.dumps(
                    {"status": "error", "message": "Missing messages or user_id"}
                )
            )
            continue

        latest_msg = (
            messages[-1].get("text", "")
            if isinstance(messages, list) and messages
            else ""
        )
        profile_block = _format_profile(profile)

        ws.send(json_mod.dumps({"status": "Searching memories..."}))
        mem_holder = {"memories": []}

        def _search():
            try:
                res = mem0_client.search(
                    query=latest_msg, user_id=user_id, limit=8, output_format="v1.1"
                )
                mem_holder["memories"] = [
                    m["memory"] for m in (res.get("results") or [])
                ]
            except Exception as e:
                print(f"[WARN] mem0 search failed: {e}")

        search_thread = threading.Thread(target=_search, daemon=True)
        search_thread.start()
        search_thread.join(timeout=MEM0_SEARCH_TIMEOUT_S)
        memories = mem_holder["memories"]

        context_parts = []
        if profile_block:
            context_parts.append(f"Identity context:\n{profile_block}")
        if memories:
            context_parts.append(
                "Relevant past memories:\n" + "\n".join(f"- {m}" for m in memories)
            )
        context = (
            "\n\n".join(context_parts)
            if context_parts
            else "No prior context yet — this is an early conversation."
        )

        ws.send(json_mod.dumps({"status": "Thinking..."}))
        collected = []
        models_to_try = [model, "gemini-2.5-flash"]
        last_err = None
        for attempt_model in models_to_try:
            collected = []
            try:
                stream = novel_client.models.generate_content_stream(
                    model=attempt_model,
                    contents=f"{context}\n\nUser said: {latest_msg}",
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT
                    ),
                )
                for chunk in stream:
                    if chunk.text:
                        collected.append(chunk.text)
                        ws.send(json_mod.dumps({"text": chunk.text}))
                last_err = None
                break  # success
            except Exception as e:
                last_err = e
                err_str = str(e)
                print(f"[WARN] model {attempt_model} failed: {err_str[:120]}")
                retryable = (
                    any(
                        tok in err_str
                        for tok in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED")
                    )
                    or "overloaded" in err_str.lower()
                    or "quota" in err_str.lower()
                )
                if not retryable:
                    break

        if last_err is not None and not collected:
            ws.send(json_mod.dumps({"error": str(last_err)}))
            continue

        ws.send(json_mod.dumps({"done": True, "memories": memories}))

        full_text = "".join(collected)

        def save_mem():
            try:
                mem0_client.add(
                    messages=[
                        {"role": "user", "content": latest_msg},
                        {"role": "assistant", "content": full_text},
                    ],
                    user_id=user_id,
                    output_format="v1.1",
                )
            except Exception as e:
                print(f"[WARN] mem0 save failed: {e}")

        threading.Thread(target=save_mem, daemon=True).start()


@app.route("/proactive/<user_id>", methods=["GET"])
def proactive_prompt(user_id):
    """Return 3 warm conversation starters derived from past memories.
    Falls back to generic prompts if Mem0 has nothing yet."""
    fallback = [
        "What did you love doing on weekends?",
        "Who were the people closest to you growing up?",
        "What places have always felt like home?",
    ]
    try:
        res = mem0_client.get_all(user_id=user_id, output_format="v1.1")
        items = res.get("results") if isinstance(res, dict) else res
        memories = [
            m.get("memory")
            for m in (items or [])
            if isinstance(m, dict) and m.get("memory")
        ]
    except Exception as e:
        print(f"[WARN] proactive fetch failed: {e}")
        return jsonify({"prompts": fallback})

    if not memories:
        return jsonify({"prompts": fallback})

    try:
        sample = "\n".join(f"- {m}" for m in memories[:20])
        resp = novel_client.models.generate_content(
            model=model,
            contents=(
                "Below are memories a person with mild cognitive decline has shared previously. "
                "Generate 3 short, warm, open-ended conversation starters (under 12 words each) that gently "
                "invite them to revisit or expand on these themes. Return ONLY a JSON array of 3 strings, no prose.\n\n"
                f"{sample}"
            ),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            ),
        )
        import json as json_mod
        import re

        text = (resp.text or "").strip()
        match = re.search(r"\[.*\]", text, re.DOTALL)
        prompts = json_mod.loads(match.group(0)) if match else fallback
        if not isinstance(prompts, list) or not prompts:
            prompts = fallback
        return jsonify({"prompts": prompts[:3]})
    except Exception as e:
        print(f"[WARN] proactive generation failed: {e}")
        return jsonify({"prompts": fallback})


@app.route("/graph/<user_id>", methods=["GET"])
def memory_graph(user_id):
    """Derive an entity graph from Mem0 memories (no Neo4j required).
    Uses Gemini to extract people / places / events and groups memories by entity."""
    try:
        res = mem0_client.get_all(user_id=user_id, output_format="v1.1")
        items = res.get("results") if isinstance(res, dict) else res
        memories = [
            {"id": m.get("id"), "memory": m.get("memory")}
            for m in (items or [])
            if isinstance(m, dict) and m.get("memory")
        ]
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

    if not memories:
        return jsonify({"entities": [], "memories": []})

    sample = "\n".join(f"{i + 1}. {m['memory']}" for i, m in enumerate(memories[:40]))
    try:
        resp = novel_client.models.generate_content(
            model=model,
            contents=(
                "Extract the key entities mentioned in these memories. For each entity, return its name, "
                "type (person | place | event | object), and the memory numbers that mention it. "
                "Return ONLY a JSON array like:\n"
                '[{"name":"Robert","type":"person","memories":[1,3,7]}, ...]\n\n'
                f"{sample}"
            ),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            ),
        )
        import json as json_mod
        import re

        text = (resp.text or "").strip()
        match = re.search(r"\[.*\]", text, re.DOTALL)
        entities = json_mod.loads(match.group(0)) if match else []
    except Exception as e:
        print(f"[WARN] graph extraction failed: {e}")
        entities = []

    return jsonify({"entities": entities, "memories": memories})


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded"}), 400

    file = request.files["file"]
    user_id = request.form.get("user_id")
    if not file or not user_id:
        return jsonify(
            {"status": "error", "message": "File and user_id are required"}
        ), 400

    filename = secure_filename(file.filename)
    upload_dir = os.path.join("uploads", user_id)
    os.makedirs(upload_dir, exist_ok=True)

    saved_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(upload_dir, saved_name)
    file.save(file_path)

    base_url = os.getenv("PUBLIC_BACKEND_URL") or request.host_url.rstrip("/")
    public_url = f"{base_url}/uploads/{user_id}/{saved_name}"

    prompt_text = (
        f"I have uploaded an image here: {public_url}. Please describe this image."
    )

    gemini_message = Content(role="user", parts=[Part(text=prompt_text)])

    mem0_client.add(
        messages=[
            {
                "role": "user",
                "content": f"Uploaded an image: {filename} (URL: {public_url})",
            }
        ],
        user_id=user_id,
        metadata={
            "type": "file_upload",
            "filename": filename,
            "upload_path": file_path,
        },
        output_format="v1.1",
    )

    summary, session_id, _ = asyncio.run(process_query_async(gemini_message, user_id))
    print("File '{filename}' uploaded and analyzed.")
    return jsonify(
        {
            "status": "success",
            "message": f"File '{filename}' uploaded and analyzed.",
            "summary": summary,
            "local_path": file_path,
            "url": public_url,
        }
    )


@app.route("/uploads/<user_id>/<filename>")
def serve_uploaded_file(user_id, filename):
    return send_from_directory(os.path.join("uploads", user_id), filename)


memory_cache = {}

neo4jUrl = os.getenv("NEO4J_URL")
neo4jUsername = os.getenv("NEO4J_USERNAME")
neo4jPassword = os.getenv("NEO4J_PASSWORD")
neo4jDb = os.getenv("NEO4J_DATABASE", "neo4j")


@app.route("/test_neo4j/<user_id>", methods=["GET"])
def test_neo4j(user_id: str):
    text = "me park today see dog with red collar"
    memory = Memory(user_id)
    memory.add(text=text)
    return jsonify({"message": "Memory added for user", "user_id": user_id})


@app.route("/user/<user_id>/test_graph", methods=["POST"])
def test_get_user_graph(user_id: str):
    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(neo4jUrl, auth=(neo4jUsername, neo4jPassword))

    query = """
    MATCH (m:Memory {userId: $user_id})
    RETURN m LIMIT 50
    """

    results = []
    with driver.session(database=neo4jDb) as session:
        data = session.run(query, user_id=user_id)
        for record in data:
            node = record["m"]
            results.append(dict(node))

        return jsonify({"status": "success", "user_id": user_id, "nodes": results})


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

    try:
        print(f"[DEBUG] Fetching graph for user_id: {user_id}")
        with GraphDatabase.driver(
            uri=neo4jUrl, auth=(neo4jUsername, neo4jPassword)
        ) as driver:
            with driver.session(database=neo4jDb) as session:
                query = """
                MATCH (u:User {userId: $user_id})-[:HAS_MEMORY]->(m:Memory)
                RETURN u, m
                """
                result = session.run(query, user_id=user_id)
                records = list(result)
                print(f"[DEBUG] Found {len(records)} graph records for {user_id}")

                graph = {"nodes": [], "links": []}
                seen_nodes = set()

                for record in records:
                    user_node = record["u"]
                    mem_node = record["m"]

                    user_id_str = str(user_node.id)
                    mem_id_str = str(mem_node.id)

                    if user_id_str not in seen_nodes:
                        graph["nodes"].append(
                            {
                                "id": user_id_str,
                                "label": user_node.get("name", "User"),
                                "properties": safe_dict(user_node.items()),
                            }
                        )
                        seen_nodes.add(user_id_str)

                    if mem_id_str not in seen_nodes:
                        graph["nodes"].append(
                            {
                                "id": mem_id_str,
                                "label": mem_node.get(
                                    "summary", mem_node.get("content", "Memory")
                                )[:20],
                                "properties": safe_dict(mem_node.items()),
                            }
                        )
                        seen_nodes.add(mem_id_str)

                    graph["links"].append(
                        {
                            "source": user_id_str,
                            "target": mem_id_str,
                            "type": "HAS_MEMORY",
                        }
                    )

                return jsonify(graph)

    except Exception as e:
        print(f"[ERROR] in /graph: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/generate", methods=["POST"])
def novel_ai_generate():
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "error": "No data was given"}), 500

        query = data.get("query")

        if not query:
            return jsonify({"status": "error", "error": "No query was given"}), 400

        # no need to use mem0, can use gemini api directly
        response = novel_client.models.generate_content(
            model=model,
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction="You are a direct text editor. When asked to improve, fix, or modify text, return ONLY the improved text without explanations, options, or additional commentary. Be concise and direct. If asked to fix grammar in 'Hello my name is Aarnav', return only 'Hello, my name is Aarnav.' Do not provide multiple options or explanations.",
                thinking_config=types.ThinkingConfig(
                    thinking_budget=0
                ),  # we are broke, so thinking is disabled for now
            ),
        )

        if not response:
            return jsonify(
                {
                    "status": "error",
                    "error": "There was an error in our model, please try again",
                }
            )

        return jsonify({"status": "success", "message": response.text})

    except Exception as error:
        print(f"[ERROR] in /api/ai/generate: {error}")
        return jsonify({"status": "error", "error": str(error)}), 500


@app.route("/user/<user_id>/populate_graph", methods=["POST"])
def populate_graph_from_mem0(user_id):
    import json

    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(neo4jUrl, auth=(neo4jUsername, neo4jPassword))

    try:
        # Get all memories for the user
        results = mem0_client.get_all(user_id=user_id, output_format="v1.1")
        print(f"[DEBUG] Raw response from mem0_client.get_all(): {results}")

        # Handle the paginated response structure
        if isinstance(results, dict) and "results" in results:
            memories = results["results"]
        elif isinstance(results, list):
            memories = results
        else:
            print(f"[ERROR] Unexpected response format: {type(results)}")
            return jsonify(
                {"status": "error", "message": "Unexpected response format from Mem0"}
            ), 500

        print(f"[DEBUG] Found {len(memories)} memories to process")

        with driver.session(database=neo4jDb) as session:
            # Ensure user node exists
            session.run("MERGE (u:User {userId: $user_id})", user_id=user_id)

            count = 0
            for mem in memories:
                print(f"[DEBUG] Processing memory: {mem}")

                # Extract memory content
                if isinstance(mem, dict):
                    memory_content = mem.get("memory")
                    memory_id = mem.get("id")
                    metadata = mem.get("metadata", {})
                    created_at = mem.get("created_at")

                    # Create summary (first 50 chars)
                    summary = (
                        memory_content[:50] + "..."
                        if len(memory_content) > 50
                        else memory_content
                    )

                    # Convert metadata to JSON string (Neo4j can store strings)
                    metadata_json = json.dumps(metadata) if metadata else "{}"

                    # Extract individual metadata fields as separate properties
                    metadata_type = (
                        metadata.get("type", "") if isinstance(metadata, dict) else ""
                    )
                    metadata_app = (
                        metadata.get("app", "") if isinstance(metadata, dict) else ""
                    )

                    exists_result = session.run(
                        "MATCH (m:Memory {id: $memory_id}) RETURN m LIMIT 1",
                        memory_id=memory_id,
                    )

                    if exists_result.single():
                        print(f"[DEBUG] Memory {memory_id} already exists, skipping")
                        continue

                    # Insert into Neo4j with proper data types
                    session.run(
                        """
                        MERGE (u:User {userId: $user_id})
                        CREATE (m:Memory {
                            id: $memory_id,
                            content: $content,
                            summary: $summary,
                            userId: $user_id,
                            createdAt: $created_at,
                            metadataJson: $metadata_json,
                            metadataType: $metadata_type,
                            metadataApp: $metadata_app
                        })
                        MERGE (u)-[:HAS_MEMORY]->(m)
                    """,
                        user_id=user_id,
                        memory_id=memory_id,
                        content=memory_content,
                        summary=summary,
                        created_at=created_at,
                        metadata_json=metadata_json,
                        metadata_type=metadata_type,
                        metadata_app=metadata_app,
                    )

                    count += 1
                    print(f"[DEBUG] Successfully inserted memory {count}: {memory_id}")

                else:
                    print(f"[DEBUG] Skipping non-dict memory: {mem}")

        driver.close()

        if count == 0:
            return jsonify(
                {
                    "status": "complete",
                    "message": "No new memories left to add. All are appened to neo4j",
                    "total_found": len(memories),
                    "total_inserted": count,
                }
            )

        return jsonify(
            {
                "status": "success",
                "message": f"{count} memories written to Neo4j for {user_id}",
                "total_found": len(memories),
                "total_inserted": count,
            }
        )

    except Exception as e:
        print(f"[ERROR] Failed to populate Neo4j: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify(
        {"status": "healthy", "service": "memory_assistant", "version": "1.1"}
    )


@app.route("/user/<user_id>/memories", methods=["GET"])
def get_user_memories(user_id):
    try:
        results = mem0_client.get_all(user_id=user_id)
        memories = [m.get("memory", str(m)) for m in results] if results else []
        return jsonify(
            {"status": "success", "memories": memories, "count": len(memories)}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --------------------------- MAIN ENTRY POINT --------------------------------
if __name__ == "__main__":
    for var in ["GOOGLE_API_KEY", "MEM0_API_KEY"]:
        if not os.getenv(var):
            print(f"Warning: missing env var {var}")

    port = int(os.getenv("PORT", 8000))
    print(f"Starting Memory Assistant API server on http://0.0.0.0:{port} …")
    app.run(debug=True, host="0.0.0.0", port=port)
