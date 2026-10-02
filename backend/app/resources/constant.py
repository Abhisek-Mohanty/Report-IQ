from enum import Enum

class MODE_LOGIN(Enum):
    GOOGLE = 1
class PLAN_TYPE(Enum):
    UNPAID = 1

class USER_CONTEXT(Enum):
    ADMIN    = 0 
    CUSTOMER = 1
    COLENDER = 2
    VENDOR   = 3
    CONNECTOR = 4
    EXTERNAL = 5
    
USER_CONTEXT_KEY = {
    "admin" : USER_CONTEXT.ADMIN,
    "customer" : USER_CONTEXT.CUSTOMER,
    "colender" : USER_CONTEXT.COLENDER,
    "vendor" : USER_CONTEXT.VENDOR,
    "connector" : USER_CONTEXT.CONNECTOR,
    "external" : USER_CONTEXT.EXTERNAL
}    
  
class STATUS(Enum):
    ACTIVE = 1
    NOTACTIVE = 0
    INACTIVE = 0
  
class EMPLOYEEMENT_STATUS(Enum):
    ON_BOARDING = 0
    INVERIFICATION = 2
    ACTIVE = 3
    ON_NOTICE = 4
    RESIGNED = 5
    TERMINATED = 6
 
class MEMBER_STATUS(Enum):
    INVITE = 1
    ACTIVE = 2
    DISABLED = 3
 
class BACKLOG_STATUS(Enum):
    NEW         = 1
    IN_PROCESS  = 2
    ON_HOLD     = 3
    BLOCKED     = 4
    CANCELLED   = 5
    COMPLETED   = 6   
 
class VERIFCATION_TYPE(Enum):
    YET_TO_VERIFY  = None
    INITATE   = 1
    VERIFIED  = 2
    FAILED    = 3

class ASSET_STATUS_TYPE(Enum):
    CREATED = None
    AVAILABLE = 1
    ASSIGNED = 2
    MAINTAINANCE = 3

class ASSIGN_STATUS_TYPE(Enum):
    INITIATED = 1
    ASSIGNED = 2
    MAINTAINANCE = 3
    HANDHOVERED = 4
    CANCELLED = 5


class MAINTAINCE_STATUS_TYPE(Enum):
    UNDER_MAINTAINCE = 1
    AVAILABLE = 2
    LOST_BROKEN = 3

    
####################################################################################################################

GENDER_TYPE = {
    0 : "Female",
    1 : "Male",
    2 : "Other",
    9 : "Not Disclosed"
}

STATUS_TYPE = {
    1: "Active",
    0: "InActive"
}


INVOICE_TYPE = {
    "I1" : "NPOAST",
    "I2" : "MANTAT",
    "I3" : "NPOLCI",
    "I4" : "RENLCI"
}

# ASSET_TYPE = {
#     "I1" : "ASLPT",
#     "I3" : "ASMTR",
#     "I4" : "ASCTV",
#     "I5" : "ASMUS",
#     "I7" : "ASCPU",
#     "I8" : "ASCPU",
    


#     ""
# }

OWNER_TYPE = {
    "O1" : "ASCMP",
    "O2" : "ASOWN",
}

SPTINT_STATUS_TYPE = {
    1 : "New",
    2 : "In Process",
    3 : "Completed",
    4 : "Cancelled",
}

BACKLOG_STATUS_TYPE = {
   1 : "New"        ,
   2 : "In Process" ,
   3 : "On Hold"    ,
   4 : "Blocked"    ,
   5 : "Cancelled"  ,
   6 : "Completed" 
}

TASK_SIZE_TYPE = {
    0: "XS",
    1: "S",
    2: "M",
    3: "L",
    4: "XL",
    5: "XXL"
}

ISSUE_TYPES = {
    1: "Issue",
    2: "Feature",
    3: "Bug",
    4: "Improvement"
}

ASSET_STATUS = {
    1 : "Available",
    2 : "Assgined",
    3 : "Maintaince"
}

ASSIGN_STATUS ={
    1 : "Initiated",
    2 : "Assigned",
    3 : "Maintainanced",
    4 : "Handovered",
    5 : "Cancelled"
}


MAINTAINCE_STATUS = {
    1: "Under-Maintaince",
    2: "Available",
    3: "Lost/Broken"
}

ASSET_TYPE = {
    1: "Laptop",
    2: "Desktop",
    3: "Mouse"
}

OWNER_TYPE = {
    1: "Techfino Capital Pvt Ltd",
    2: "BOYD",
    3: "Rented"
}


