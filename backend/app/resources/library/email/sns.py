import boto3
import requests
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.resources.constant import *
from app.resources.library.S3.index import s3Bucket
from app.core.config import CLIENT_PATH

from fastapi import FastAPI
from app.core.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_ARN, AWS_REGION2, SYSTEM_NOTIFICATION_EMAIL
from app.resources.helper.common import getAttr
import json

# importing datetime module
import datetime

class SnsEmail( ):  
    sns = None
    def __init__(self) -> None:
        self.sns = boto3.client(
            "sns",
            aws_access_key_id = AWS_ACCESS_KEY_ID,
            aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
            region_name = AWS_REGION2
        )
            
    async def sendEmail(self, addresses: any, subject: str, content: str, attachments : any = [], options : any = {} ):        
        try:
            if len(addresses) == 0:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST, detail='Mail Receipient list is empty.'
                )
            globalAttachments = []
            if( options.get("attachments") ):
                for item in options.get("attachments"):
                    if(type(item) != str and item.get("content")):
                        globalAttachments.append({ "content" : item.get("content"), "filename" : item.get("filename") })
                    else:
                        globalAttachments.append({ "filepath" : item if type(item) == str else item.get("filename") })

            emailList = []
            for  entity in addresses:
                toList = []
                ccList = []
                bccList = []
                sender = None
                
                if type(entity) is dict:
                    toList = entity.get("to",[])
                    ccList = entity.get("cc",[])
                    bccList = entity.get("bcc",[])
                    sender = entity.get("from",None)
                else:
                    toList = entity
                
                current_content = content
                if options.get("payload"):
                    current_content = content % options.get("payload")

                mail_tempalte = ['<table style="max-width : 700px; width: 100%; display:inline-block;">',
                                '<tr><td style="border-radius:8px; overflow: hidden;"><div style="padding:5px; background: rgb(87, 96, 199);"><span style="font-size:2rem; color:#FFF;">Techfino HRMS</span><br>',
                                '<span style="color:#FFF;">HR Done Right, Every Time</span>',
                                '<span style="color:#FFF; float:right">TechFino Capiral Pvt. Ltd.</span>',
                                '</div></td></tr>',
                                f'<tr><td style="padding-top:10px; font-family: Arial; font-size: 16px;">{current_content}</td></tr>',
                                '<tr><td style="border-top: 5px solid #C0C0C0; padding-top:8px;">',
                                '<div style="text-align: justify; font-size: 11px; color: rgb(96, 96, 96);">This e-mail and/or material contained herein is confidential, privileged or otherwise protected from disclosure. The information is solely intended for the designated recipient and purpose only and may contain privileged, proprietary, confidential or otherwise private information. If you are not an intended recipient of this e-mail, do not duplicate or redistribute it. Please delete it along with any attachments and/or other material and notify the sender that you have received it in error and/or contact TCPL as below for appropriate action. Any review, retransmission, dissemination or other unauthorized use of, or taking of any action in reliance upon this information by persons or entities other than the intended recipient is strictly prohibited and unlawful and TCPL is not responsible for the same. Any views or opinions presented are solely those of the author and do not necessarily represent those of TCPL.</div>',
                                '</td></tr>',
                                '</table>']    
                attachmentsList = []
                
                for item in attachments:
                    if(type(item) != str and item.get("content")):
                        attachmentsList.append({ "content" : item.get("content"), "filename" : item.get("filename") })
                    else:
                        attachmentsList.append({ "filepath" : item if type(item) == str else item.get("filename") })

                emailList.append({
                    "to_email" : [toList] if type(toList) is not list else toList,
                    "cc_mail"  : [ccList] if type(ccList) is not list else ccList,
                    "bcc_mail"  : [bccList] if type(bccList) is not list else bccList,
                    "subject"  : subject,
                    "body"     : "".join(mail_tempalte),
                    "from"     : SYSTEM_NOTIFICATION_EMAIL,
                    "attachments" : attachmentsList
                })
                
                # print(emailList)
                
            mailOptions = {
                "email_list": emailList,
                "attachments" : globalAttachments,
                "from" : options.get("sender",None)
            }
            
            if options.get("replyTo",None):
                mailOptions["replyTo"] = options.get("replyTo",None) 
                
            self.sns.publish(
                Message = json.dumps(mailOptions),
                TopicArn = EMAIL_ARN
            )
            return True
        except Exception as error:
            print("An exception occurred:", error)
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INTENAL_SERVER_ERROR
            )