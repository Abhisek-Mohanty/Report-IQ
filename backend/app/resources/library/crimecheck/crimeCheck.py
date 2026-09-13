import requests
from app.resources.constant import *
from app.core.config import CRIME_CHECK_URL,CRIME_CHECK_AUTH,CRIME_CHECK_CALLBACK_URL
import asyncio
from app.resources.library.S3.index import s3Bucket


class CrimeChecks():
    headers = None
    def __init__(self) -> None:
        self.headers = {
            'Authorization': CRIME_CHECK_AUTH,
            'Content-Type': 'application/x-www-form-urlencoded'
        }

    async def initiateRequest(self, userDetails):
        try:
            api_url = CRIME_CHECK_URL
            body = {
                "name": userDetails['fullName'],
                "fatherName": userDetails['fatherName'],
                "address": f"{userDetails['address']} {userDetails['address2']}".strip(),
                # "address2": "",
                "dob": userDetails['dob'],
                "panNumber": userDetails['panNumber'],
                "callbackUrl": CRIME_CHECK_CALLBACK_URL
            }

            def send_request():
                return requests.post(api_url, data=body, headers=self.headers)

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, send_request)

            try:
                initiateRes = response.json()
            except Exception:
                return {"success": False, "message": "Invalid JSON response from API"}

            return initiateRes

        except Exception as error:
            print("Request error:", error)
            return {"success": False, "message": str(error)}


    def getCrimeCheckPdf(self, requestId):
        try:

            url = f"{CRIME_CHECK_URL}?requestId={requestId}"
            headers = {
                'Authorization': CRIME_CHECK_AUTH,
                'Cookie': 'connect.sid=s%3As6JurncJzdQcnwoqUO2sHetLKZ6NGRIS.hXz7ElFEIu4pA1tBhVv6BZmZd8PXe0vdoD9Bc96WOEc'
            }

            response = requests.get(url, headers=headers)

            if response.status_code != 200:
                return None

            if response.headers.get("Content-Type") != "application/pdf":
                return None

            return response.content

        except Exception as error:
            print("🔥 Exception:", error)
            raise error

