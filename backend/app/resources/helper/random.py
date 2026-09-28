
import math, random
import uuid

class Random():
    def genOTP(self, size = 6):
        # Declare a digits variable  
        # which stores all digits 
        digits = "0123456789"
        result = 0
    
        # length of password can be changed
        # by changing value in range
        size = size - 1
        if size < 0:
            return "" 
        size = pow( 10, size)
        while( result < size ):
            result = ( result * 10 ) + int(digits[math.floor(random.random() * 10)])
    
        return str(result)
    
    def genString(self, size = 8, charList = "ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"):
        result = ""
        charLen = len(charList)
        for i in range(size) :
            result = result + charList[math.floor(random.random() * charLen)]
    
        return result
    
    def genUUID(self, size = 4):
        if size == 1:
            return uuid.uuid1()
        elif size == 2:
            return uuid.uuid2()
        elif size == 3:
            return uuid.uuid3()
        return uuid.uuid4()