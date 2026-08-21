from datetime import timedelta
import json
import re
import base64
from app.resources.helper.moment import Moment
from app.core.config import JWT_TOKEN_PREFIX, SERVER_DEFAULT_OFFSET

from app.core import config
# from app.api.response.http_response import SendErrorResponse

def isMobile(txt):
    oList =re.findall(r'Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini', txt)
    return True if len(oList) > 1 else False

            
def getAttr(obj, attr, val = None ):
    if type(obj) is not dict:
        if hasattr(obj,attr):
            return getattr(obj,attr,val)
        return val
    
    if attr in obj:
        if obj[attr] is None:
            return val
        return obj[attr]
    else:
        return val
    
def dict2obj(dict1):
    class obj:
        # constructor
        def __init__(self, dict1):
            self.__dict__.update(dict1)

    # using json.loads method and passing json.dumps
    # method and custom object hook as arguments
    return json.loads(json.dumps(dict1), object_hook=obj)
    
def getDate(oDate):
    if type(oDate) is dict and "year" in oDate:
        oDate = str(oDate["year"]) + "-" + str(oDate["month"]) + "-" + str(oDate["day"])
    else:
        oDate = None
    return oDate

def getDateObject(oDate):
    return {
        "year":oDate.strftime("%Y"),
        "month":oDate.strftime("%m"),
        "day":oDate.strftime("%d")
    }

def simple_decrypt(encrypted_text, key):
    encrypted_text = encrypted_text.replace('_', '/').replace('-', '\\')
    decoded_text = base64.b64decode(encrypted_text).decode('utf-8')
    result = ''
    for i in range(len(decoded_text)):
        result += chr(ord(decoded_text[i]) ^ ord(key))
    return result

def getLocalDateTime(utc_datetime):
    if SERVER_DEFAULT_OFFSET == 0:
        return utc_datetime
    offset = int(SERVER_DEFAULT_OFFSET)
    offset_delta = timedelta(minutes=offset)
    local_datetime = utc_datetime + offset_delta
    return local_datetime
            
def getAge(dob):
    today = Moment()
    dob = Moment(dob,"%Y-%m-%d")
    age = int(today.format("%Y")) - int(dob.format("%Y"))
    m = int(today.format("%m")) - int(dob.format("%m"))
    if m < 0 or (m == 0 and int(today.format("%d")) < int(dob.format("%d"))):
        age -= 1
    
    return age
            
def getDateth(dt = None):
    today = Moment()
    if dt:
        today = Moment(dt,"%Y-%m-%d")
    parts = []
    parts.append(today.format("%d"))
    mod = int(parts[0]) % 10 
    
    if mod == 1:  
        parts[0] = f'{ parts[0] }st'
    elif mod == 2:  
        parts[0] = f'{ parts[0] }nd'
    elif mod == 3:  
        parts[0] = f'{ parts[0] }rd'
    else:
        parts[0] = f'{ parts[0] }th'
        
    parts.append("day of")
    parts.append(today.format("%b"))
    parts.append(str(today.format("%Y")))
    
    return " ".join(parts)

def amountInWord(num):
    if num == 0:  
        return "zero"  
    
    one = [ "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ",
            "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "]
    ten = [ "", "", "Twenty ", "Thirty ", "Forty ", "Fifty ", "Sixty ", "Seventy ", "Eighty ", "Ninety "] # This code only the range of 0 to 100
    
    def numToWords(n, s): 
        str = ""
        if (n > 19):
            str += ten[n // 10] + one[n % 10]
        else:
            str += one[n]
        if (n):
            str += s
        
        return str; # This is for 20 to almost infinity # Function to print a given number in words
    
    out = ""
    out += numToWords((num // 10000000), "Crore ")
    out += numToWords(((num // 100000) % 100),"Lakh ")
    out += numToWords(((num // 1000) % 100),"Thousand ")
    out += numToWords(((num // 100) % 10),"Hundred ")
    if (num > 100 and num % 100):
        out += "And "
        out += numToWords((num % 100), "") 
    return out

def returnErrorResponse(error , debug = False, db_session = None):
    if db_session :
        db_session.rollback()
    
    if debug:
        raise error
    
    # return SendErrorResponse(
    #     message = str(error)
    # )
    
def uniqueList(oList):
    list_set = set(oList)
    return (list(list_set))

def compareObject(obj1, obj2):
    objKey1=obj1.keys()
    objKey2=obj2.keys()
    # if set(objKey1)!= set(objKey2):
    #     return False
    # objList=list(obj1.keys())
    for keys in objKey2:
     if keys!='id':
        attrvalue1 = getAttr(obj1, str(keys))
        attrvalue2 = getAttr(obj2, str(keys))
        if str(attrvalue1) != str(attrvalue2):
            return True
    return False

def updateArray(arr, arrOfCon):    
    updatedArray = []
    for i in range(len(arr)):
        if arrOfCon[i]:
            updatedArray.append(arr[i])
    return updatedArray

def maskContact(strValue):
    masked_value = ''.join(
         char if i % 2 == 0 else 'X' for i, char in enumerate(strValue))
    return masked_value

def gstCalculation(chargeAmount, type):
    finalAmout = 0
    if chargeAmount > 0:
        finalAmout = chargeAmount / 1.18
        if type == "gst":
            finalAmout = chargeAmount - finalAmout
    return round(finalAmout,2)

def addGST(chargeAmount, ratio = 18):
    finalAmout = 0
    if chargeAmount > 0:
        finalAmout = chargeAmount * ( (100 + ratio) / 100)
    return round(finalAmout,2)

def getFormatedData(oModel, attributes = [], seperator = " "):
    oReturn = []
    if not oModel : return ""
    for oItem in attributes:
        if oModel.getattr(oItem):
            oReturn.append(str(oModel.getattr(oItem)))    

    return(seperator).join(oReturn)

def getLastSubString(vString = "", size = 4):
    if not vString : return ""
    return vString[-(size):]
    