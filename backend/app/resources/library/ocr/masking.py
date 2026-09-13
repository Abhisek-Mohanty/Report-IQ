import json
from app.resources.library.ocr.aadhar import Aadhaar_Card
import pytesseract
import re
from PIL import Image
import ftfy
import re
import cv2
import numpy as np
import base64
import os
import io

class Masking( ):  
    
    async def processImage(self, ofilename):
        try:
            # base64_bytes = base64.b64encode(filename)
            # filename = base64_bytes.decode("ascii")
            pytesseract.pytesseract.tesseract_cmd = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
            
            filename = io.BytesIO(ofilename)
            text = pytesseract.image_to_string(Image.open(filename), lang = 'eng')

            text = ftfy.fix_text(text)
            text = ftfy.fix_encoding(text)

            print(text)
            data = {}
            if "income" in text.lower() or "tax" in text.lower() or "department" in text.lower():
                data = self.pan_read.pan_read_data(text)
            elif "male" in text.lower():
                data = await self.adhaar_read_data(text, ofilename)
            
            print(data)    
            return data
        except BaseException as error:
            print(error)
            pass
        
    async def to_image_string(self, image_filepath):
        return base64.b64encode(open(image_filepath, 'rb').read())#.encode('base64')
        
    async def adhaar_read_data(self, text, filename):
        res=text.split()
        name = None
        dob = None
        adh = None
        sex = None
        nameline = []
        dobline = []
        text0 = []
        text1 = []
        text2 = []
        lines = text.split('\n')
        for lin in lines:
            s = lin.strip()
            s = lin.replace('\n','')
            s = s.rstrip()
            s = s.lstrip()
            text1.append(s)

        if 'female' in text.lower():
            sex = "FEMALE"
        else:
            sex = "MALE"
        
        text1 = list(filter(None, text1))
        text0 = text1[:]
        
        try:

            # Cleaning first names
            name = text0[2]
            name = name.rstrip()
            name = name.lstrip()
            name = name.replace("8", "B")
            name = name.replace("0", "D")
            name = name.replace("6", "G")
            name = name.replace("1", "I")
            name = re.sub('[^a-zA-Z] +', ' ', name)

            # Cleaning DOB
            dob = text0[3][-10:]
            dob = dob.rstrip()
            dob = dob.lstrip()
            dob = dob.replace('l', '/')
            dob = dob.replace('L', '/')
            dob = dob.replace('I', '/')
            dob = dob.replace('i', '/')
            dob = dob.replace('|', '/')
            dob = dob.replace('\"', '/1')
            dob = dob.replace(":","")
            dob = dob.replace(" ", "")

            # Cleaning Adhaar number details
            aadhar_number=''
            for word in res:
                if len(aadhar_number)<= 14 and len(word) == 4 and word.isdigit():
                    aadhar_number = aadhar_number  + word + ' '
            if len(aadhar_number)>=14:
                print("Aadhar number is :"+ aadhar_number)
            else:
                print("Aadhar number not read")
            adh=aadhar_number

        except:
            pass

        try:    
            data = {}
            data['Name'] = name
            data['Date of Birth'] = dob
            data['Adhaar Number'] = adh
            data['Sex'] = sex
            data['ID Type'] = "Adhaar"
            
            return data
        
            config = {'orient' : True,    #corrects orientation of image default -> True
                    'skew' : False,     #corrects skewness of image default -> True
                    'crop': True,       #crops document out of image default -> True
                    'contrast' : True,  #Bnw for Better OCR default -> True
                    'psm': [3,4,6],     #Google Tesseract  psm modes by default 3,4,6. 
                    'mask_color': (0, 165, 255),  #Masking color BGR Format
                    'brut_psm': [6]     #Note : Keep only one psm for brut mask (6) is good to start
                    }

            ac = Aadhaar_Card(config)
            
            temp_name = "../../../../../temp_unmasked.png" 
            
            decoded_data = base64.b64decode(filename)
            print("Here")
            # decoded_data = decoded_data.decode("ascii")
                
            np_data = np.fromstring(decoded_data,np.uint8)
            print("Here")
            
            img = cv2.imdecode(np_data,cv2.IMREAD_UNCHANGED)
            
            cv2.imwrite(temp_name,img)
            
            aadhaar_list = ac.extract(temp_name)
            
            if len(aadhaar_list) == 0 :
                mode_executed = "BRUT-OCR-MASKING"
                write = "../../../../../temp_brut_masked.png"
                mask_status = ac.mask_nums(temp_name, write)
                img_bytes = self.to_image_string(write)
                #convert byte to string
                encoded_string = img_bytes.decode("utf-8")
                data["masked_img"] = {'doc_b64_masked':encoded_string, 'is_masked': True,'mode_executed' : mode_executed}
                
            # if len(aadhaar_list) == 0 and not r['brut']:
            #     mode_executed = "OCR-MASKING"
            #     data["masked_img"] = {'doc_b64_masked':'None', 'is_masked': False, 'error':'Unable to find aadhaar number','mode_executed' : mode_executed}
                
            elif len(aadhaar_list) > 0 :
                mode_executed = "OCR-MASKING"
                # for masking first 8 digits from the number
                ori_aadhaar_list = aadhaar_list
                aadhaar_list = list(map(lambda x: x[:8] , aadhaar_list)) # Comment out this incase you want to mask entire aadhaar
                write = "../../../../../temp_masked.png"
                flag_mask = ac.mask_image(temp_name, write, aadhaar_list)
                img_bytes = self.to_image_string(write)
                #convert byte to string
                encoded_string = img_bytes.decode("utf-8")
                valid_aadhaar_list = list(filter(lambda x: (ac.validate(x) == 1) , ori_aadhaar_list))
            
                data["masked_img"] = {'doc_b64_masked':encoded_string, 'is_masked': True,'mode_executed' : mode_executed, 'aadhaar_list':ori_aadhaar_list, 'valid_aadhaar_list':valid_aadhaar_list}

            return data
        except BaseException as error:
            print(error)
            
    async def pan_read_data(self, text):
        name = None
        fname = None
        dob = None
        pan = None
        nameline = []
        dobline = []
        panline = []
        text0 = []
        text1 = []
        text2 = []
        lines = text.split('\n')
        for lin in lines:
            s = lin.strip()
            s = lin.replace('\n','')
            s = s.rstrip()
            s = s.lstrip()
            text1.append(s)
            
        text1 = list(filter(None, text1))
        lineno = 0
        for wordline in text1:
                xx = wordline.split('\n')
                if ([w for w in xx if re.search('(INCOMETAXDEPARWENT|INCOME|TAX|GOW|GOVT|GOVERNMENT|OVERNMENT|VERNMENT|DEPARTMENT|EPARTMENT|PARTMENT|ARTMENT|INDIA|NDIA)$', w)]):
                    text1 = list(text1)
                    lineno = text1.index(wordline)
                    break
        text0 = text1[lineno+1:]
        try:
        # Cleaning first names
                name = text0[0]
                name = name.rstrip()
                name = name.lstrip()
                name = name.replace("8", "B")
                name = name.replace("0", "D")
                name = name.replace("6", "G")
                name = name.replace("1", "I")
                name = re.sub('[^a-zA-Z] +', ' ', name)
        # Cleaning Father's name
                fname = text0[1]
                fname = fname.rstrip()
                fname = fname.lstrip()
                fname = fname.replace("8", "S")
                fname = fname.replace("0", "O")
                fname = fname.replace("6", "G")
                fname = fname.replace("1", "I")
                fname = fname.replace("\"", "A")
                fname = re.sub('[^a-zA-Z] +', ' ', fname)
        # Cleaning DOB
                dob = text0[2][:10]
                dob = dob.rstrip()
                dob = dob.lstrip()
                dob = dob.replace('l', '/')
                dob = dob.replace('L', '/')
                dob = dob.replace('I', '/')
                dob = dob.replace('i', '/')
                dob = dob.replace('|', '/')
                dob = dob.replace('\"', '/1')
                dob = dob.replace(" ", "")
        # Cleaning PAN Card details
                text0 = findword(text1, '(Pormanam|Number|umber|Account|ccount|count|Permanent|ermanent|manent|wumm)$')
                panline = text0[0]
                pan = panline.rstrip()
                pan = pan.lstrip()
                pan = pan.replace(" ", "")
                pan = pan.replace("\"", "")
                pan = pan.replace(";", "")
                pan = pan.replace("%", "L")
        except:
            pass
        
        data = {}
        data['Name'] = name
        data['Father Name'] = fname
        data['Date of Birth'] = dob
        data['PAN'] = pan
        data['ID Type'] = "PAN"
        
        return data

    async def findword(textlist, wordstring):
        lineno = -1
        for wordline in textlist:
            xx = wordline.split( )
            if ([w for w in xx if re.search(wordstring, w)]):
                lineno = textlist.index(wordline)
                textlist = textlist[lineno+1:]
                return textlist
        return textlist