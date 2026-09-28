import boto3
import requests
from starlette.exceptions import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.resources.constant import *

from fastapi import FastAPI, UploadFile, File
from app.core.config import AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION2, AWS_BUCKET_NAME, AWS_BUCKET_PATH
import datetime

# from app.resources.library.digio.digio import Digio

class s3Bucket( ):
    bucketName = AWS_BUCKET_NAME  
    bucketPath = AWS_BUCKET_PATH  
    def __init__(self, bucket = None) -> None:
        self.s3 = boto3.client(
            "s3",
            aws_access_key_id = AWS_ACCESS_KEY_ID,
            aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
            region_name = AWS_REGION2
        )
        if bucket is not None:
            self.bucketName = bucket

    async def getPath(filename : str) -> any: 
        return filename
    
    async def upload(self, file: any, s3Path : str, filename : str = "", signedURL = True, fixedName = False) -> dict: 
        if filename is not None:
            filename = filename or file.filename
        
        # current dateTime
        now = datetime.datetime.now()

        # convert to string
        date_time_str = now.strftime("%Y%m%d-%H%M%S-")
        try:
            if fixedName and s3Path:
                if filename:
                    filename = s3Path + "/"+ filename 
                else:
                    filename = s3Path 
            else:
                filename = s3Path + "/"+ date_time_str+ filename if s3Path else date_time_str+ filename
            
            filename = self.bucketPath +"/" + filename
            if type(file) is not str and hasattr(file,"file"):
                self.s3.upload_fileobj(file.file, self.bucketName, filename)
            else:
                self.s3.put_object(Body=file, Bucket=self.bucketName, Key=filename)
            if signedURL:
                return {"filename": filename, "url" : await self.getSignedURL(filename) }
            else:
                return {"filename": filename }
        except:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INTENAL_SERVER_ERROR
            )
            
    async def replaceFile(self, file: any, s3Path : str) -> dict: 
        
        try:
            if type(file) is not str and hasattr(file,"file"):
                self.s3.upload_fileobj(file.file, self.bucketName, s3Path)
            else:
                self.s3.put_object(Body=file, Bucket=self.bucketName, Key=s3Path)
            
            return {"filename": s3Path, "url" : await self.getSignedURL(s3Path) }
        
        except:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST, detail=error_strings.INTENAL_SERVER_ERROR
            )
        

    async def getSignedURL(self, filename : str, expiry = 600) -> any: 
        try:
            params={
                'Bucket': self.bucketName,
                'Key': filename
            }
            response = self.s3.generate_presigned_url(
                            'get_object',
                            Params=params,
                            ExpiresIn=expiry
                        )
            return { "url" : response }
        except:
            return None
        
    async def getFileContet(self, filename) -> any:
        try:
            response = self.s3.get_object(
                            Bucket = self.bucketName,
                            Key = filename
                        )
            return response['Body'].read().decode('utf-8')
        except HTTPException as error:
            print(error)
            raise error
    
    async def getFileContetRaw(self, filename) -> any:
        try:
            response = self.s3.get_object(
                            Bucket = self.bucketName,
                            Key = filename
                        )
            return response['Body'].read()
        except HTTPException as error:
            raise error
            
