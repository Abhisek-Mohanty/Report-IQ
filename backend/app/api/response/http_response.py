import pandas as pd
from datetime import datetime

from typing import Any
from starlette.status import HTTP_400_BAD_REQUEST
from app.resources import error_strings
from app.db.errors import *
from app.resources.helper.common import *
from app.resources.helper.encoder import *

import io
from fastapi import Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseConfig, BaseModel

class ResModel(BaseModel):
    class Config(BaseConfig):
        populate_by_name = True

class SendResponse(BaseModel):
    message : Any = None
    data : Any = None
    
    def send(self):
        try:
            self.message = self._processMessage(self.message)
            if type(self.data) is SendExportResponse :
                oPrepareData = pd.DataFrame(self.data.send())            
                output = io.BytesIO()
                writer = pd.ExcelWriter(output, engine='xlsxwriter')
                
                oPrepareData.to_excel(writer, index=False)
                writer.close()
                return StreamingResponse(io.BytesIO(output.getvalue()),
                    media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    headers={ "Content-Disposition": f'attachment; filename={self.data.fileName}', "fileName" : self.data.fileName }
                )

            if type(self.data) is SendSuccessResponse :
                return { 
                    "message" : self._processMessage(self.data.message),
                    "data"    : jsonable_encoder(self.data.data) if type(self.data.data) is not dict else self.data.data
                }
            
            if type(self.data) is SendFileResponse :
                return StreamingResponse(io.BytesIO(bytes(self.data.content, 'utf-8') if type(self.data.content) == str else self.data.content ),
                    media_type= self.data.mediaType,
                    headers={ "Content-Disposition": f'attachment; filename={self.data.fileName}', "fileName" : self.data.fileName }
                )
            
            if type(self.data) is SendRawFileResponse :
                return FileResponse( 
                    self.data.content 
                )
            
            if type(self.data) is SendErrorResponse:
                raise ErrorResponse(
                    status_code=HTTP_400_BAD_REQUEST, 
                    detail = self._processMessage(self.data.message) or error_strings.INTENAL_SERVER_ERROR
                )
            
            if self.data and self.data.get("error",False) == True:
                raise ErrorResponse(
                    status_code=HTTP_400_BAD_REQUEST, 
                    detail = self.data.get("message",error_strings.INTENAL_SERVER_ERROR)
                )
            else:
                data = self.data.get("data", {}) if self.data else {}
                data = jsonable_encoder(data) if data and type(data) is not dict else data
                return { 
                    "message" : self._processMessage(self.data.get("message",self.message)),
                    "data"    : data 
                }
        except Exception as error:
            raise error

    def _processMessage(self, messages):
        if messages:
            return "<br/>".join(messages) if type(messages) == list else messages
        else:
            return ""

class SendSuccessResponse(BaseModel):
    message : Any = ""
    data : Any = None
    
    def send(self):
        return {
                "error" : False , 
                "message" : self._processMessage(self.message), 
                "data" : jsonable_encoder(self.data) if self.data else self.data
            }
    
    def _processMessage(self, messages):
        return "<br/>".join(messages) if type(messages) == list else messages
    
class SendErrorResponse(BaseModel):
    message : Any = ""
    data : Any = None
    
    def send(self):

        return { 
                "error" : True , 
                "message" : self._processMessage(self.message), 
                "data" : jsonable_encoder(self.data) if self.data and type(self.data) is not dict else self.data 
            }
    
    def _processMessage(self, messages):
        return "<br/>".join(messages) if type(messages) == list else messages
    
        
class SendRawFileResponse(BaseModel):
    message : Any = ""
    content : Any = None
    
    def send(self):
        return { 
            "message" : self._processMessage(self.message), 
            "data" : { 
                "content"  : self.content,
            }         
        }
    
    def _processMessage(self, messages):
        return "<br/>".join(messages) if type(messages) == list else messages
    
        
class SendFileResponse(BaseModel):
    message : Any = ""
    fileName : Any = None
    content : Any = None
    mediaType : Any = None
    
    def send(self):
        return { 
            "error" : True , 
            "message" : self._processMessage(self.message), 
            "data" : { 
                "fileName" : self.fileName,
                "content"  : io.BytesIO(self.content) if type(self.content) == str else self.content,
                "mediaType"  : self.mediaType
            }         
        }
    
    def _processMessage(self, messages):
        return "<br/>".join(messages) if type(messages) == list else messages
    
        
class SendExportResponse(BaseModel):
    message : Any = ""
    header : Any = {}
    data : Any = {}
    fileName : Any = ""

    def __init__(self, **data):
        super().__init__(**data)
        current_time = datetime.now().strftime("%d-%m-%Y_%H:%M:%S")
        if self.fileName:
            self.fileName = f"{self.fileName}_{current_time}.xlsx"
        else:
            self.fileName = f"ExportData_{current_time}.xlsx"

    def send(self):
        data = {}

        self.data = jsonable_encoder(self.data) if type(self.data) is not dict else self.data
        for header in self.header:
            data[self.header.get(header)] = {}

        for index, item in enumerate(self.data):
            for header in self.header:
                data[self.header.get(header)][index+1] = item.get(header)

        return data
    
# class SendResponse(Response):
#     media_type = "application/json"

#     def render(self, content: Any) -> bytes:
#         assert orjson is not None, "orjson must be installed"
#         return orjson.dumps(content, option=orjson.OPT_INDENT_2)
#         # return orjson.dumps({ 'message' : content.message , 'data' : content.data }, option=orjson.OPT_INDENT_2)