from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

from app.core.config import SERVER_DEFAULT_OFFSET

class Moment():
    now = datetime.now()
    def __init__(self,date = None, format = '%Y-%m-%d %H:%M:%S') -> None:
        try:
            if date and ( date == "--" or date == "0000-00-00 00:00:00" or date == "0000-00-00" or date == "00:00:00" ):
                self.now = None
                return
            
            self.now = datetime.now()
            if date:
                if isinstance(date, Moment):
                    self.now = date.now
                else:
                    self.now = date
                if type(self.now) is str:
                    self.now = datetime.strptime(self.now, format)    
        except Exception as error:
            self.now = None
            return

    def isSameOrBefore(self, date):
        return datetime.strptime(date, '%Y-%m-%d') <= self.now
    
    def isSame(self, date):
        return datetime.strptime(date,  '%Y-%m-%d') == self.now
    
    def isValid(self,date):
        try:
            datetime.strptime(date, '%Y-%m-%d')
            return True
        except ValueError:
            return False
    
    def getLocalDate(self, callback = True):
        if SERVER_DEFAULT_OFFSET != 0:
            self.add(SERVER_DEFAULT_OFFSET,"M")
        if callback:
            return self.now
        return self
        
    def getISO(self):
        if SERVER_DEFAULT_OFFSET != 0:
            offset = int(SERVER_DEFAULT_OFFSET)
            offset_delta = timedelta(minutes=offset)
            self.now = self.now + offset_delta
                
    def getDate(self, callback = True):
        if callback:
            return self.now
        return self
    
    def format(self, format = '%Y-%m-%d %H:%M:%S', callback = True, dateFormat= None):
        if not self.now:
            return None
        aReturn = self.now.strftime(format)
        if callback:
            return aReturn
        self.now = datetime.strptime(aReturn , dateFormat if dateFormat else format)
        return self
    
    def istformat(self, format = '%d-%m-%Y', callback = True):
        if not self.now:
            return None
        aReturn = self.now.strftime(format)
        if callback:
            return aReturn
        self.now = datetime.strptime(aReturn, format)
        return self
    
    def fromUnix(self, ts , callback = True):
        if not self.now:
            return None
        aReturn = datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
        if callback:
            return aReturn
        self.now = datetime.strptime(aReturn, '%Y-%m-%d %H:%M:%S')
        return self
    
    def add(self, count : int = 0, part : str = "H", callback = True):
        if not self.now:
            return None
        if(count < 0):
            return self.substract(abs(count),part,callback)
        
        if part == 'H' or part == 'hours':
            self.now = self.now + timedelta(hours = count)
        elif part == 'M'  or part == 'minutes':
            self.now = self.now + timedelta(minutes = count)
        elif part == 'S' or part == 'seconds':
            self.now = self.now + timedelta(seconds = count)
        elif part == 'D' or part == 'days':
            self.now = self.now + timedelta(days = count)
        elif part == 'W' or part == 'weeks':
            self.now = self.now + timedelta(weeks = count)
        elif part == 'm' or part == 'months':
            self.now = self.now + relativedelta(months = count)
        elif part == 'Y' or part == 'years':
            self.now = self.now + relativedelta(years = count)
        if callback:
            return self.now
        return self
    
    def substract(self, count : int = 0, part : str = "H", callback = True):
        if not self.now:
            return None
        if part == 'H' or part == 'hours':
            self.now = self.now - timedelta(hours = count)
        elif part == 'M' or part == 'minutes':
            self.now = self.now - timedelta(minutes = count)
        elif part == 'S' or part == 'seconds':
            self.now = self.now - timedelta(seconds = count)
        elif part == 'D' or part == 'days':
            self.now = self.now - timedelta(days = count)
        elif part == 'W' or part == 'wweks':
            self.now = self.now - timedelta(weeks = count)
        elif part == 'm' or part == 'months':
            self.now = self.now - relativedelta(months = count)
        elif part == 'Y' or part == 'years':
            self.now = self.now - relativedelta(years = count)
        if callback:
            return self.now
        return self