import requests
import base64 
import uuid
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.resources.constant import *

from fastapi import FastAPI
from app.core.config import DIGIO_AADHAR_TEMPLATE_NAME, DIGIO_CLIENT_ID, DIGIO_CLIENT_SECRET, DIGIO_END_POINT, DIGIO_VEDIO_EKYC_TEMPLATE_NAME

import json

# importing datetime module
import datetime

class Digio( ):  
    headers = None
    def __init__(self) -> None:
        sample_string = DIGIO_CLIENT_ID + ':' + DIGIO_CLIENT_SECRET
        string_bytes = sample_string.encode("ascii") 
  
        base64_bytes = base64.b64encode(string_bytes) 
        authorization = 'Basic ' + base64_bytes.decode("ascii") 
        self.headers = {
            'Authorization': authorization,
            'Content-Type': 'application/json'
        }

    async def verify(self, panNumber: str):
        panRecord = {}
        try:
            api_url = DIGIO_END_POINT + '/v3/client/kyc/fetch_id_data/PAN'
            body = { 
                "id_no": panNumber.upper() if panNumber else ""
            }
            
            response = requests.post(api_url, data=json.dumps(body), headers=self.headers)
            panRecord = response.json()
            
            errorMessage = panRecord and hasattr( panRecord, "message")
            errorCode = panRecord and hasattr(panRecord, "code")

            if errorCode == "SYSTEM_ERROR":
                panRecord = {
                    "error": True,
                    "status"  : "INDETERMINATE",
                    "message" : errorMessage or 'SERVER ERROR'
                }
            
        except Exception as error:
            errorMessage = panRecord and hasattr( panRecord, "message")
            panRecord = {
                "error": True,
                "status": "INDETERMINATE",
                "message": errorMessage or 'SERVER ERROR'
            }
        return panRecord
    
    async def getMaskedAadhar(self, aadharImage):
        try:
            base64_bytes = base64.b64encode(aadharImage)
            imageBase64 = base64_bytes.decode("ascii")
            requestId =  str(uuid.uuid4()).replace('-', '')
            api_url = DIGIO_END_POINT + '/v3/client/kyc/aadhaar/mask?resp_json=true'
            body = {
                "unique_request_id": str(requestId),
                "data": imageBase64,
                "data_content_type": "PDF",
                "consent": "yes"
            }

            response = requests.post(api_url, data=json.dumps(body), headers=self.headers)
            maskedAadhar = response.json()
            
            if maskedAadhar and not maskedAadhar.get("data"):
                print("Error: Invalid response from Digio", maskedAadhar)
                return None

            return base64.b64decode(maskedAadhar.get("data"))

        except Exception as error:
            print("Error in getMaskedAadhar:", error)
            return None

    async def sendEkycRequest(self, employee):
        try:
            oData = {
                "customer_identifier": employee.mobile,
                "customer_name": employee.firstName + " " + employee.lastName,
                # "template_name": DIGIO_VEDIO_EKYC_TEMPLATE_NAME,
                "template_name": DIGIO_AADHAR_TEMPLATE_NAME,
                "generate_access_token": True
            }

            api_url = f'{DIGIO_END_POINT}/client/kyc/v2/request/with_template'
            response = requests.post(api_url, data=json.dumps(oData), headers=self.headers)
            return response.json()

        except Exception as error:
            print("Error in ekyc registration:", error)
            return False
        
    async def getEkycResponse(self, requestId):
        try:
            api_url = f'{DIGIO_END_POINT}/client/kyc/v2/{requestId}/response'
            response = requests.post(api_url, headers=self.headers)
            return response.json()

        except Exception as error:
            print("Error in ekyc registration:", error)
            return False
