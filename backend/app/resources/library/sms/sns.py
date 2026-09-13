import boto3
import requests
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.resources.constant import *

from fastapi import FastAPI
from app.core.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SMS_ARN, AWS_REGION2
import json

# importing datetime module
import datetime

class SnsSMS( ):  
    sns = None
    def __init__(self) -> None:
        self.sns = boto3.client(
            "sns",
            aws_access_key_id = AWS_ACCESS_KEY_ID,
            aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
            region_name = AWS_REGION2
        )

    async def sendSMS(self, numbers: any, message: str):        
        try:
            smsList = []
            for item in numbers:
                smsList.append({"to_phone": str(item), "msg": message })
            
            self.sns.publish(
                Message = json.dumps({
                    "sms_list": smsList
                }),
                TopicArn = SMS_ARN
            )
        except Exception as error:
            print("An exception occurred:", error)
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INTENAL_SERVER_ERROR
            )
