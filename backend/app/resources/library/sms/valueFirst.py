
import boto3
import requests
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.resources.constant import *

from fastapi import FastAPI
from app.core.config import VALUE_FIRST_URL, VALUE_FIRST_PRIORITY_TOKEN, VALUE_FIRST_NON_PRIORITY_TOKEN
import json

# importing datetime module
import datetime

class ValueFirstSMS( ):  
    def __init__(self) -> None:
        self.priorityToken= VALUE_FIRST_PRIORITY_TOKEN
        self.nonPriorityToken = VALUE_FIRST_NON_PRIORITY_TOKEN


    async def sendSMS(self, number: any, messageDetails: dict, isPriority:bool = False):
        try:
            print("messageDetails--", messageDetails)

            headers = {
                'Authorization' : self.nonPriorityToken
                }
            if isPriority:
                print("priorityHeader--")
                headers['Authorization'] = self.priorityToken

            body = {
                "@VER": "1.2",
                "USER": {},
                "DLR": {
                    "@URL": ""
                },
                "SMS": [
                    {
                        "@UDH": "0",
                        "@CODING": "1",
                        "@TEXT": messageDetails["message"],
                        "@PROPERTY": "0",
                        "@ID": "1",
                        "ADDRESS": [
                            {
                                "@FROM": "TCPLIN",
                                "@TO": "91" + str(number),
                                "@SEQ": "1",
                                "@TAG": ""
                            }
                        ]
                    }
                ]
            }
            vFirstTransTemplateIdWithData = messageDetails.get("vFirstTransTemplateIdWithData")
            vFirstOtpTemplateIdWithData = messageDetails.get("vFirstOtpTemplateIdWithData")
            if (isPriority and vFirstOtpTemplateIdWithData) or (not isPriority and vFirstTransTemplateIdWithData):
                tempBody= {
                    "@VER": "1.2",
                    "USER": {},
                    "DLR": {
                        "@URL": ""
                    },
                    "SMS": [
                        {
                            "@UDH": "0",
                            "@CODING": "1",
                            "@TEMPLATEINFO": vFirstOtpTemplateIdWithData,
                            "@PROPERTY": "0",
                            "@ID": "1",
                            "ADDRESS": [
                                {
                                    "@FROM": "TCPLIN",
                                    "@TO": "91" + str(number),
                                    "@SEQ": "1",
                                    "@TAG": ""
                                }
                            ]
                        }
                    ]
                }
                if not isPriority:
                    tempBody["SMS"][0]["@TEMPLATEINFO"] = vFirstTransTemplateIdWithData
                    print("notPriority----")
                else:
                    print("priority----")


                body = tempBody
            print("body---", body)

            # if messageDetails.get("vFirstTransTemplateIdWithData"):
            #     if not isPriority and messageDetails.get("vFirstTransTemplateIdWithData"):
            #         tempBody["SMS"][0]["@TEMPLATEINFO"] = messageDetails["vFirstTransTemplateIdWithData"]


            response = requests.post(VALUE_FIRST_URL, json=body, headers=headers)
            print("response1--",response.text)
            if response.status_code == 200:
                return True, None
            
            return False, str(response.status_code)

        except Exception as error:
            print("An exception occurred:", error)
            return False, str(error)
