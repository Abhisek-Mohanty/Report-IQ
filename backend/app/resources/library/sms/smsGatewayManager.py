import boto3
import requests
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.resources.constant import *
from fastapi import FastAPI
from app.core.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SMS_ARN, AWS_REGION2
from app.resources.library.sms.sns import SnsSMS
from app.resources.library.sms.valueFirst import ValueFirstSMS

class SmsGatewayManager( ):  
    def __init__(self) -> None:
        self.sns = SnsSMS()
        self.valueFirst = ValueFirstSMS()

    async def sendSMS(self, numbers: any, messageDetail: dict , gateWaySelector: any = None, isPriority: bool = False):
        try:
            print("gateway--",messageDetail)
            isValueFirstSMSSuccess = False
            valueFirstErrorCode = None

            if not gateWaySelector or (gateWaySelector and gateWaySelector[SMS_GATEWAYS.VALUE_FIRST.value]):
                isValueFirstSMSSuccess, valueFirstErrorCode =  await self.valueFirst.sendSMS(numbers[0], messageDetail, isPriority)
                print("response--",isValueFirstSMSSuccess,valueFirstErrorCode)

            elif (not gateWaySelector or (gateWaySelector and gateWaySelector[SMS_GATEWAYS.AWSSNS.value])) and not isValueFirstSMSSuccess :
                await self.sns.sendSMS(numbers,messageDetail["message"])

            else:
                raise Exception("ValueFirstErrorCode: " + valueFirstErrorCode)

        except Exception as error:
            print("An exception occurred:", error)
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INTENAL_SERVER_ERROR
            )
