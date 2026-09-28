import requests
import base64 
from app.resources.constant import *
from app.core.config import MSME_CLIENT_ID, MSME_CLIENT_SECRET, MSME_END_POINT, MSME_API_KEY
import json

class MSME( ):  

    headers = None
    def __init__(self) -> None:
        sample_string = MSME_CLIENT_ID + ':' + MSME_CLIENT_SECRET
        string_bytes = sample_string.encode("ascii") 
  
        base64_bytes = base64.b64encode(string_bytes) 
        authorization = 'Basic ' + base64_bytes.decode("ascii") 
        self.headers = {
            'Authorization' : authorization,
            'Content-Type'  : 'application/json',
            'apikey'        : MSME_API_KEY
        }
    
    async def pushToMsme(self, oData):
        try:
            api_url = MSME_END_POINT + '/employee/create'
            
            oResponse = requests.post(api_url, data=json.dumps(oData), headers=self.headers)
            try:
                oResponse = oResponse.json()
            except Exception:
                return {"errorType": True, "message": "Invalid JSON response from MSME"}

            return oResponse
        
        except Exception as error:
            print("Error in Employee sync:", error)
            return {"errorType": True, "message": "Error in Employee sync:"+ str(error) }
