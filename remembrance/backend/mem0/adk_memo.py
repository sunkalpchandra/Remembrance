import os
from google.adk.agents import Agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from mem0 import MemoryClient
from flask import Flask, request, jsonify
from flask_cors import CORS

# use flask to return endpoint:
"""
{
    result_return: "",
    // any more params we want
}
"""

# create 2 agents (multi-agent system): one for parsing through query => passed to mem0 wrapper
# will use cerebras for that due to fast inference layer

google_api_key = os.environ["NEXT_PUBLIC_GOOGLE_API_KEY"]
mem0_api_key = os.environ["NEXT_PUBLIC_MEM0_API_KEY"]

user_id = "alex" # can save username of user and keep it as user_id during onboarding
mem0_client = MemoryClient()

app_name = "memory_alzheimers_assistant_app"
session_id = "session_001"

def save_user_info(information: str) -> dict:
    response = mem0_client.add(
        [
            {
                "role": "user",
                "content": information
            }
        ],
        user_id=user_id,
        run_id="healthcare_session",
        metadata={"type": "patient_information"}
    )

def retrieve_user_info(query: str) -> dict:
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
    
# can add extra "helper" functions if necessary for wrapper
    
memory_agent = Agent(
    name="healthcare_assistant",
    model="gemini-1.5-flash",
    description="Helping patients log through saved memories, and acting as an agent for this",
    instruction="""You are a helpful memory alzheimers assistant, where you have memory capabilities and query searches for every prompt the user does after specific tokenization by another llm""", # do some prompt fine-tuning stuff
    tools=[save_user_info, retrieve_user_info]
)

session_service = InMemorySessionService()

session = session_service.create_session(
    app_name=app_name,
    user_id=user_id,
    session_id=session_id
)

runner = Runner(
    agent=memory_agent,
    app_name=app_name,
    session_service=session_service
)

app = Flask(__name__)
CORS(app)

@app.route("/query", methods=["POST"])
def handle_query():
    data = request.json
    query = data.get("query")
    user_id_input = data.get("user_id")

    global user_id
    user_id = user_id_input

    try:
        result = runner.run(query, session=session)
        return jsonify({
            "status": "success",
            "result_return": result.text if hasattr(result, "text") else str(result)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "main":
    app.run(debug=True)