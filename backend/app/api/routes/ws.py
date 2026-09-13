from fastapi import FastAPI, WebSocket, APIRouter, Request, Body, WebSocketDisconnect
import asyncio
from typing import Dict, List
import json
from websockets.exceptions import ConnectionClosed
from app.resources.helper.moment import Moment

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.customers: Dict[str, WebSocket] = {}
        self.agents:  Dict[str, WebSocket] = {}

    async def connect(self, group, websocket: WebSocket):
        try:
            if group not in self.active_connections:
                self.active_connections[group] = []
        
            self.active_connections[group].append(websocket)
        except:
            pass
        
    async def disconnect(self, group, websocket: WebSocket):
        try:
            await websocket.close()
            self.active_connections[group].remove(websocket)

            if len(self.active_connections[group]) == 0:
                del self.active_connections[group]
            
            if self.customers.get(group) == websocket:
                del self.customers[group]
                await self.broadcast(group, json.dumps( { "offline" : True }))
        except:
            pass
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except:
            pass
        
    async def broadcast(self, group, message: str, websocket = None):
        try:
            print(len(self.active_connections[group]))
            for connection in self.active_connections[group]:
                if ( websocket != connection):
                    await connection.send_text(message)
        except:
            pass
        
    async def callAll(self, group):
        try:
            for connection in self.active_connections[group]:
                await connection.close()
                self.active_connections[group].remove(connection)

            del self.active_connections[group] 
            
            if self.customers.get(group):
                del self.customers[group]
        except:
            pass
            
    ############ AGENT ############
    async def connectAgent(self, agentId, websocket: WebSocket):
        try:
            self.agents[agentId] = websocket
        except:
            pass
        
    async def disconnectAgent(self, agentId, websocket: WebSocket):
        try:
            await websocket.close()
            del self.agents[agentId]
        except:
            pass
        
    async def broadcastAgent(self, message: str):
        try:
            for connection in self.agents:
                await connection.send_text(message)
        except:
            pass
    
    
manager = ConnectionManager()

@router.websocket("/messages/{leadId}")
async def websocket_endpoint(leadId:str, websocket: WebSocket):
    try:
        await websocket.accept()
        await manager.connect(leadId,websocket)
        while True:
            
            
            await asyncio.sleep(0.1)
            message = await websocket.receive()
            message = json.loads(message.get("text"))
            if( message.get("message")):
                if( message.get("message") == "customer"):
                    manager.customers[leadId] = websocket
                    await manager.broadcast(leadId,json.dumps( { "online" : True }))
                elif( message.get("message") == "check"):
                    if manager.customers.get(leadId, None):
                        await manager.send_personal_message(json.dumps( { "online" : True }),websocket)
                    else:
                        await manager.send_personal_message(json.dumps( { "offline" : True }),websocket)
                else:
                    message_data = {
                        "message"  : message.get("message")
                    }
                    json_message = json.dumps(message_data)

                    await manager.broadcast(leadId,json_message, websocket)
            elif( message.get("media")):
                await manager.broadcast(leadId,json.dumps(message))
                
            elif( message.get("stream")):
                await manager.broadcast(leadId,json.dumps(message))
                
    except WebSocketDisconnect:
        await manager.disconnect(leadId, websocket)
    except ConnectionClosed:
        await manager.disconnect(leadId, websocket)
    except:
        await manager.disconnect(leadId, websocket)
        pass
    
@router.websocket("/agent/{agentId}")
async def websocket_agentEndpoint(agentId : str, websocket: WebSocket):
    try:
        await websocket.accept()
        await manager.connectAgent(agentId, websocket)
        while True:
            
            await asyncio.sleep(0.1)
            message = await websocket.receive()
            
            message = json.loads(message.get("text"))
            if( message.get("message")):
                if type(message) == dict and message.get("checkLead"):
                    await manager.send_personal_message( json.dumps(manager.customers.keys,websocket) )
                elif type(message) == dict and message.get("agent"):
                    await manager.send_personal_message( json.dumps( { "message" : message.get("message") }),manager.agents[message.get("agent")] )
                else:    
                    message_data = {
                        "message"  : message
                    }
                    json_message = json.dumps(message_data)

                    await manager.broadcastAgent(json_message)
            
    except WebSocketDisconnect:
        await manager.disconnectAgent( agentId, websocket)
        json_message = json.dumps({ "disconnect" : agentId })
        await manager.broadcastAgent(json_message)
    except:
        pass

@router.post('/close')
async def create_room_handler(
    data = Body(...)
):
    leadId = data.get("leadId")
    await manager.callAll(leadId)
    return {"message": f'Connection Closed'}