from google import genai
from google.genai import types
from app.db.errors import *

from app.core.config import GOOGLE_GEMINI
from app.prompt.system_instruction import SYSTEM_INSTRUCTIONS


class GEMINI_AI:

    def __init__(self):
        self.client = genai.Client(
            api_key=GOOGLE_GEMINI
        )

    async def gemini_response(self, prompt: str,operation_instruction: str = ""):
        try:
            if not prompt or type(prompt) != str:
                raise ErrorResponse (504,"Please enter valid prompt.")
            response = self.client.models.generate_content(
                        model="gemini-3.5-flash-lite",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTIONS + "\n\n"+ operation_instruction,
                            max_output_tokens=10000,
                            temperature=0.7,
                        )
                    )
            return response
        
        except Exception as error:
            print("Error in External Model:", error)
            return {"errorType": True, "message": "Error in External Model:"+ str(error) }