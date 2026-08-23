import base64
import smtplib 
import time
import ssl
from email.message import EmailMessage
from email.header import decode_header, make_header
import imaplib
import email
import re
import chardet

from app.core.config import INCOMING_HOSTNAME, OUTGOING_HOSTNAME, SMTP_PORT 
from app.api.response.http_response import SendErrorResponse, SendSuccessResponse

class WebMail():
    smtp = None
    imap = None
    
    mailSetting = {
        "gmail" : {
            "OUTGOING_HOSTNAME" : "smtp.gmail.com",
            "SMTP_PORT" : 465,
            "INCOMING_HOSTNAME" : "imap.gmail.com",
            "IMAP_PORT" : 993,
            "POP_HOSTNAME" : "imap.gmail.com",
            "POP_PORT" : 995,
            "IMAP4_SSL" : True
        },
        "office360" : {
            "OUTGOING_HOSTNAME" : "smtp-mail.outlook.com",
            "SMTP_PORT" : 587,
            "INCOMING_HOSTNAME" : "outlook.office365.com",
            "IMAP_PORT" : 993,
            "POP_HOSTNAME" : "outlook.office365.com",
            "POP_PORT" : 995,
            "IMAP4_SSL" : False
        }
    }
    connectionSetting = None
    ######### SMTP #########
    def __init__(self, provider: any) -> None:
        self.connectionSetting = self.mailSetting.get(provider, None)
    
    def use_smtp( self, user ):
        if not self.connectionSetting:
            return "Invalid Connection Setting."
        
        outgoing_hostname = self.connectionSetting.get("OUTGOING_HOSTNAME")
        smtp_port = self.connectionSetting.get("SMTP_PORT")
        
        if smtp_port == 465:
            # smtp connection.
            try:
                self.smtp = smtplib.SMTP_SSL(outgoing_hostname, smtp_port)
            except:
                return "SMTP Connection Failed"
        else:
            # smtp connection.
            try:
                self.smtp = smtplib.SMTP(outgoing_hostname, smtp_port)
                self.smtp.starttls(context=ssl.create_default_context())
            except:
                return "SMTP Connection Failed"

        # Test SMTP Login
        try:
            self.smtp.login(user.emailId, user.passkey)
        except Exception as error:
            return "SMTP Auth Failed"

        return False
    
    def authenticate(self, user):
        if not self.connectionSetting:
            return "Invalid Connection Setting."
        
        # Initialize connection.
        imap_host = self.connectionSetting.get("INCOMING_HOSTNAME")
        imap_port = self.connectionSetting.get("IMAP_PORT")
        
        try:
            if self.connectionSetting.get("IMAP4_SSL"):
                self.imap = imaplib.IMAP4_SSL(imap_host,imap_port)
            else:
                self.imap = imaplib.IMAP4(imap_host,imap_port)
                self.imap.starttls()
        except:
            return "Connection Failed"
        
        # Auth to the server.
        try:
            self.imap.login(user.emailId, user.passkey)
            self.imap.select()
            return True
        except imaplib.IMAP4.error:
            return "Auth Failed"
        except Exception as error:
            return str(error)
    
    def close(self):
        if(self.imap):
            self.imap.close()
            self.imap.logout()
                
    ######### Home Page #########
    def home(self, user, payload):
        # num_msg_per_page Messages per page.
        num_msg_per_page = payload.get("limit",20)

        imap = self.authenticate( user )
        if self.checkImap(self.imap):
            return imap
            
        # GET parameters
        msg_num = payload.get('msg_num', type = int)
        folder = payload.get('folder')
        page_num = payload.get('page_num', type = int)

        # Handel if GET parameters are not supplied.

        # If folder is not supplied,
        if bool(folder) != True:
            # Default to loading the INBOX.
            self.close()
            return SendSuccessResponse(
                
            ).send()

        # If page_num is unspecified,
        if bool(page_num) != True:
            # Go to first page,
            self.close()
            return SendSuccessResponse(
                
            ).send()
        
        # If the msg_num is unspecified, 
        if bool(msg_num) != True:
            # And there are messages in the folder, 
            id_list = self.get_id_list(folder)
            if id_list != []:
                top_msg_on_page = int(id_list[-1]) - (num_msg_per_page * page_num) + num_msg_per_page
                self.close()
                return SendSuccessResponse(
                
                ).send()

        # If there are no messages in the folder,
        if self.get_id_list(folder) == []:
            messages = ""
            body = "No messages in folder!"
            num_pages = 1
        else:
            last_msg_num = int(self.get_id_list(folder)[-1]) 

            # Find page number from msg_num.
            difference = last_msg_num - int(msg_num)
            correct_page_num = int(difference / num_msg_per_page) + 1

            # If not on the right page change pages,
            if int(page_num) != correct_page_num:
                self.close()
                return SendSuccessResponse(
                
                ).send()

            # By this point the page_num, and msg_num should be set correctly.
            num_pages = int(last_msg_num / num_msg_per_page) + (last_msg_num % num_msg_per_page > 0)

            # Magic pagination algorithm. Will rewrite to make more readable soon.
            messages = self.message_list(self.imap, folder, range((last_msg_num - (num_msg_per_page * page_num) + 1), (last_msg_num - ((page_num - 1) * num_msg_per_page) + 1)))
            body = self.get_msg_body(msg_num, folder)
        
        id_list = self.get_id_list(folder)
        if len(id_list) > 0:
            num_messages_in_folder = id_list[-1]
        else:
            num_messages_in_folder = 0

        sorted_folders = self.sort_folders()
        self.close()
        
        return {
            "user"    : user, 
            "body"    : body, 
            "sorted_folders" :sorted_folders, 
            "messages"  : messages, 
            "num_pages" : num_pages, 
            "num_messages_in_folder" : num_messages_in_folder
        }
       
    def getList(self, user, payload):
        try:
            num_msg_per_page = int(payload.get("limit",20))
            folderLimit = int(payload.get("count",0))
            page_num = int(payload.get('page', 1))
            if not page_num :
                page_num = 1
                
            imap = self.authenticate( user )
            if self.checkImap(self.imap):
                return imap
                
            folder = payload.get('folder')
            
            reminder = num_msg_per_page - (folderLimit % num_msg_per_page)
            
            folderLimit = num_msg_per_page * page_num
                
            startCount = folderLimit - num_msg_per_page - reminder
            endCount = folderLimit - reminder + 1
            if startCount < 1:
                startCount = 1
            
            idRange = range(startCount, endCount)
            idRange = idRange[::-1]
            oMsgLostList = self.message_list(self.imap, folder, idRange )
            return oMsgLostList

        except Exception as error:
            return "SMTP Auth Failed"
       
    def getFolders(self, user):
        try:
            imap = self.authenticate( user )
            if self.checkImap(self.imap):
                return imap
                
            sorted_folders = self.sort_folders()
            self.close()
            return {
                "sorted_folders" :sorted_folders
            } 

        except Exception as error:
            
            return "SMTP Auth Failed"    
      
    ######### Send Page #########
    def send( self, user, payload ):
        
        from_addr = user.emailId
        
        to_addr = payload.get("to_addr")
        subject = payload.get("subject")
        body = payload.get("body")
        draft = payload.get("draft")

        message = EmailMessage()
        message["To"]      = to_addr
        message["From"]    = from_addr
        message["Subject"] = subject 
        message.set_payload(body)

        if bool(draft) == True:
            imap = self.authenticate(user)
            if self.checkImap(self.imap):
                return imap
    
            self.imap.select('INBOX.Drafts')
            self.imap.append('INBOX.Drafts', '', imaplib.Time2Internaldate(time.time()), str(message).encode("utf-8"))
            self.close()
            
            return SendSuccessResponse(
                message =  "Message saved to Drafts."
            ).send()

        else:
            smtp = self.use_smtp()
            if self.checkImap(smtp):
                return smtp

            self.smtp.sendmail(from_addr, to_addr, message.as_string())
            self.smtp.quit()
            
            return SendSuccessResponse(
                message =  "Message Sent!"
            ).send()
        
            
    ######### Send Page #########

    def getmail( self, user, payload ):
        try:
            # GET parameters
            msg_num = int(payload.get('msgId'))
            folder = payload.get('folder')
            
            imap = self.authenticate(user)
            if self.checkImap(self.imap):
                return imap

            oResult = self.get_msg_body(msg_num, folder)

            self.imap.close()
            self.imap.logout()

            return oResult
        
        except Exception as error:
            raise error
            return "SMTP Auth Failed"
           
    def getmailAction( self, user, payload ):
    
        # GET parameters
        msg_num = payload.get('msgId', type = int)
        folder = payload.get('folder')
        mode = payload.get('mode')

        smtp = self.use_smtp()
        if self.checkImap(smtp):
            return smtp
        
        if bool(msg_num) != True or bool(msg_num) != True or bool(mode) != True:
            body = None
            to_addr = None
            subject = None
        else:
            imap = self.authenticate(user)
            if self.checkImap(self.imap):
                return imap

            body = self.get_msg_body( msg_num, folder)

            # Get subject.
            subject_line = body.split('\n', 3)[2]
            subject = subject_line.split(":",1)[1].strip()

            # Reformat body text.
            if mode == "reply":
                # Pull out from addr using regex.
                from_line = body.partition('\n')[0]
                from_addr = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', from_line).group(0)
                to_addr = from_addr
                if folder == "INBOX.Drafts":
                    new_body_list = []
                    should_append = False
                    for line in body.splitlines():
                        if should_append == True:
                            new_body_list.append(line)
                        if "Subject" in line:
                            should_append = True

                    # First line after "Subject:" is always a space.
                    new_body_list.pop(0)

                    body = '\n'.join(new_body_list)

                    # Delete message from drafts.
                    self.move_msg_to_trash(msg_num, folder)
                else:
                    subject = "Re: " + subject

                    results = []
                    results.append("> --------------- Original Message ---------------")
                    results.append("> ")

                    # Add leading > Chars to body.
                    for line in body.split('\n'):
                        results.append("> " + line)

                    body = '\n\n' + '\n'.join(results)

            elif mode == "forward":
                to_addr = None
                subject = "Fwd: " + subject

                results = []
                results.append("--------------- Original Message ---------------")

                # Add leading > Chars to body.
                for line in body.split('\n'):
                    results.append(line)

                body = '\n\n' + '\n'.join(results)


            self.close()

        return {
            "user"    : user, 
            "body"    : body, 
            "to_addr" : to_addr, 
            "subject" : subject
        }
    ######### Delete Page #########

    def trash( self, user , payload ):
        msg_num = payload.get("msg_num")
        folder = payload.get("folder")

        if bool(msg_num) != True or bool(folder) != True:
            return "No action Taken."
        else:
            imap = self.authenticate(user)
            if self.checkImap(self.imap):
                return imap
                
            response = self.move_msg_to_trash( msg_num, folder, del_pref="trash")

            self.close()
                
            if response == "Trashed":
                return "Message moved to Trash!"
            elif response == "Deleted":
                return "Message Permanently Deleted!"
            else:
                return "Error!"
            
    ######### Move Page #########

    def msg_move( self, user , payload ):
        msg_num = payload.get('msg_num', type = int) 
        src_folder = payload.get("src_folder", type  = str)
        dst_folder = payload.get("dst_folder", type = str)

        if bool(msg_num) != True or bool(src_folder) != True or bool(dst_folder) != True:
            return SendErrorResponse(
                message =  "No action Taken."
            ).send()
        elif src_folder == dst_folder:
            return SendErrorResponse(
                message =  f"Message already in {src_folder}!"
            ).send()
        else:

            imap = self.authenticate(user)
            if self.checkImap(self.imap):
                return imap
            
            result = self.move_msg( msg_num, src_folder, dst_folder)
            self.close()
            
            if result == True:
                return SendSuccessResponse(
                    message =  f"Message moved to {dst_folder}!"
                ).send()
            else:
                return SendSuccessResponse(
                    message =  "Error moving message!"
                ).send()

    ######### Status Page #########

    def status( self, user, payload ):
        if(payload.get("folder")):
            folder = payload.get("folder")
            
            imap = self.authenticate(user)
            if self.checkImap(self.imap):
                return imap
            
            id_list = self.get_id_list(folder)
            num_messages_in_folder = id_list[-1]

            self.close()
            
            return SendErrorResponse(
                data = {"num_msgs": f"{num_messages_in_folder}"}
            ).send()
        else:
            return SendErrorResponse(
                message = "Fatal Error! Bad Request!"
            ).send()

    def checkImap(self, oInstance):
        message = ""
        if oInstance == "Auth Failed":
            message =  "Please correct your Email settings."
            
        if oInstance == "Connection Failed":
            message =  "Please double check your settings."
            
        if oInstance == "SMTP Auth Failed":
            message =  "Please correct your Email settings."
            
        if oInstance == "SMTP Connection Failed":
            message =  "Please double check your settings."
        
        # if oInstance != True:
        #     message =  oInstance
        
        if message:
            return SendErrorResponse(
                message =  message
            ).send()
        else:
            return None
    

    def check_for_trash_folder(self):
        resp_code, directories = self.imap.list()

        print("IMAP List Response Code : {}".format(resp_code))

        for directory in directories:
            # print(directory.decode('utf-8'))
            directory_name = directory.decode().split('"')[-1].strip()
            if directory_name == "INBOX.Trash":
                print("Has Trash Folder!")
                return True

        return False

    def delete_msg(self, msg_num):
            resp_code, response = self.imap.store(str(msg_num), '+FLAGS', '\\Deleted')
            # print("Response Code : {}".format(resp_code))
            # print("Response      : {}\n".format(response[0].decode()))

            resp_code, response = self.imap.expunge()
            # print("Response Code : {}".format(resp_code))
            # print("Response      : {}\n".format(response[0].decode()))

    def move_msg(self, msg_num, src_folder, dst_folder):

        self.imap.select(mailbox=f'"{src_folder}"', readonly=False)

        try:
            # Copy Message to dst_folder
            resp_code, response = self.imap.copy(str(msg_num), f'"{dst_folder}"')
            # print("Response Code : {}".format(resp_code))
            # print("Response      : {}".format(response[0].decode()))

            # Delete Message from src_folder
            resp_code, response = self.imap.store(str(msg_num), '+FLAGS', '\\Deleted')
            
            # Expunge src_folder
            resp_code, response = self.imap.expunge()
            
            return True

        except:
            return False
        

    def move_msg_to_trash(self, msg_num, folder, del_pref):
        if self.check_for_trash_folder() == True:

            self.imap.select(mailbox=folder, readonly=False)

            # Delete message if already in trash.
            if folder == "INBOX.Trash" or folder == "INBOX.Drafts" or del_pref == "delete":
                self.delete_msg(msg_num)
                return "Deleted"
            # Otherwise move message to the trash and then delete from current
            # folder.
            else:
                resp_code, response = self.imap.copy(str(msg_num), "INBOX.Trash")
                print("Response Code : {}".format(resp_code))
                print("Response      : {}".format(response[0].decode()))
                
                self.delete_msg(self.imap, msg_num)

                return "Trashed"
        else:
            return False

    def sort_folders(self, folder = None):
        # List directories
        resp_code, directories = self.imap.list()

        folders = {}
        
        # Pull out folder names and number of messages.
        for directory in directories:
            
            directoryList = directory.decode().split('"')
            directory_name = directoryList[-1]
            if directory_name == "":
                directory_name = directoryList[-2]
                
            directory_name = directory_name.strip()
            check = True
            if folder and not str(directory_name).startswith(folder):
                check = False
                
            if check and directory_name:
                try:
                    resp_code, mail_count = self.imap.select(mailbox=f'"{directory_name}"', readonly=True)
                    folders.update({directory_name: str(mail_count[0], 'utf-8')})
                except:
                    print(f"Cannot get number of messages for: {directory_name}")
        
        sorted_folders = {}

        for key in sorted(folders.keys()):
            sorted_folders.update({key: folders[key]})

        return sorted_folders

    def message_list(self, imap, folder, id_list):
        # Select all mailbox information.
        self.imap.select(str(f'"{folder}"'), readonly=True)
        self.imap.search(None, 'Unseen')
        # Initialize empty messages list.
        messages = []
        
        def getMsg(msg):
            if msg.get_content_type() == "text/plain":
                return str(msg.get_payload())

            for parte in msg.walk():
                if parte.get_content_type() == "text/plain":
                    return str(parte)
                
        for i in id_list:
            try:
                typ, msg_data = self.imap.fetch(str(i), '(RFC822)')
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        messages.append({ 
                            "id" : i, 
                            "from" : str(make_header(decode_header(msg['from']))), 
                            "subject" : str(make_header(decode_header(str(msg['subject'])))) if msg['subject'] else "", 
                            "date" : str(msg['date']),
                            "msg" : getMsg(msg),
                            "attachments" : self.parseAttachment(msg)
                        })
            except:
                pass

        return messages

    def get_msg_body_string(self, msg):
        msg_string_header = f"From: {msg['from']}\nDate: {msg['date']}\nSubject: {msg['subject']}\n\n"
        
        if msg.get_content_type() == "text/plain":
            return msg_string_header + msg.get_payload()

        for parte in msg.walk():
            if parte.get_content_type() == "text/plain":
                return msg_string_header + str(parte)

    def get_msg_body(self, msg_num, folder):
        self.imap.select(str(f'"{folder}"'), readonly=True)
        resp_code, msg_data = self.imap.fetch(str(msg_num), '(RFC822)') ## Fetch mail data.
        
        def parseMail(msg):
            text = ""
            if msg.is_multipart():
                html = None
                for part in msg.get_payload():
                    if part.get_content_charset() is None:
                        charset = chardet.detect(str(part))['encoding']
                    else:
                        charset = part.get_content_charset()
                    if part.get_content_type() == 'text/plain':
                        text = str(part.get_payload(decode=True),str(charset),"ignore").encode('utf8','replace')
                    if part.get_content_type() == 'text/html':
                        html = str(part.get_payload(decode=True),str(charset),"ignore").encode('utf8','replace')
                    if part.get_content_type() == 'multipart/alternative':
                        for subpart in part.get_payload():
                            if subpart.get_content_charset() is None:
                                charset = chardet.detect(str(subpart))['encoding']
                            else:
                                charset = subpart.get_content_charset()
                            if subpart.get_content_type() == 'text/plain':
                                text = str(subpart.get_payload(decode=True),str(charset),"ignore").encode('utf8','replace')
                            if subpart.get_content_type() == 'text/html':
                                html = str(subpart.get_payload(decode=True),str(charset),"ignore").encode('utf8','replace')

                if html is None:
                    return text.strip()
                else:
                    return html.strip()
            else:
                text = str(msg.get_payload(decode=True),msg.get_content_charset(),'ignore').encode('utf8','replace')
                return text.strip()
        
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg_bytes = response_part[1]
                msg = email.message_from_bytes(msg_bytes)
                
                return { 
                    "id" : msg_num, 
                    "from" : str(make_header(decode_header(msg['from']))), 
                    "to" : str(make_header(decode_header(msg['to']))), 
                    "cc" : str(make_header(decode_header(msg['cc']))) if msg['cc'] else "", 
                    "bcc" : str(make_header(decode_header(msg['bcc'])))  if msg['bcc'] else "", 
                    "to_addr" : str(make_header(decode_header(msg['from']))), 
                    "mailed-by" : str(make_header(decode_header(msg['mailed-by']))) if msg['mailed-by'] else "", 
                    "security" : str(msg['security']) if msg['security'] else "", 
                    "reply-to" : str(make_header(decode_header(msg['reply-to']))) if msg['reply-to'] else "", 
                    "subject" : str(make_header(decode_header(str(msg['subject'])))) if msg['subject'] else "", 
                    "date" : str(msg['date']),
                    "msg" : parseMail(msg),
                    "attachments" : self.parseAttachment(msg,True)
                }
                
        return {}

    def parseAttachment(self, mail, content = False):
        b = mail
        attachment = []

        if b.is_multipart():
            for part in b.walk():
                ctype = part.get_content_type()
                cdispo = str(part.get('Content-Disposition'))

                # skip any text/plain (txt) attachments
                if 'attachment' in cdispo:
                    file_data = part.get_payload(decode=True)
                    base64_bytes = base64.b64encode(file_data)
                    base64_string = base64_bytes.decode("ascii")
                    oData = {"filename" : part.get_filename(), 
                                        "type" : part.get_content_type(), 
                                        "size" : len(file_data) }
                    if content :
                        oData["content"] = base64_string, 
                                        
                    attachment.append(oData)
        return attachment
        
    def get_id_list(self, folder):
        # Select all mailbox information.
        self.imap.select(str(f'"{folder}"'), readonly=True)

        type, data = self.imap.search(None, 'ALL')
        mail_ids = data[0].decode('utf-8')
        id_list = mail_ids.split()
        return id_list

