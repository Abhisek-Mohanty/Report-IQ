# Importing the PIL library
from http.client import HTTPException
from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont
from PIL import ImageOps
from pillow_heif import register_heif_opener

import numpy as np

import requests 
import io
 
async def addLatLong(oSource, texts = [], latLong = [], isURL = True, isHeic = False):
    try:
        if isHeic:
            register_heif_opener()
            
        img = None
        if isURL :
            response = requests.get(oSource, stream= True)
            oTmp = io.BytesIO(response.content)
            # Open an Image
            img = Image.open(oTmp)
        else:
            request_object_content = await oSource.read()
            # Open an Image
            img = Image.open(io.BytesIO(request_object_content))
        
        # Save the image to an in-memory file
        in_mem_file = io.BytesIO()

        fontSizes = {
            1000 : 30,
            900  : 26,
            800  : 22,
            700  : 18,
            600  : 14,
            500  : 12,
            400  : 11  
        }
        
        if img.width > 1000:
            newHeight = int(( img.height * 1000 ) / img.width)
            # Resize the edited image
            img = img.resize(tuple([1000, newHeight]), Image.BOX)
        
        size = None
        for o in fontSizes:
            if img.width <= o:
                size = fontSizes[o]
                         
        
        darkImg = Image.new("RGB", (img.width , img.height + max(len(texts), len(latLong)) * ( size + 13 )))
        darkImg.paste(img, (0, 0))
        
        # Call draw Method to add 2D graphics in an image
        I1 = ImageDraw.Draw(darkImg)
        
        height = img.height + 10
        width = 20
        
        # Custom font style and font size
        # myFont = ImageFont.truetype('./app/Fonts/JosefinSans-Bold.ttf', size)
        myFont = ImageFont.truetype('./app/Fonts/Mulish-Bold.ttf', size)
        
        # Add Text to an image
        for text in texts:
            I1.text((width, height), text, font=myFont, fill =(255, 255, 255))
            height += ( size + 3 )
        
        height = img.height + 10
        width = img.width - 300
        for text in latLong:
            I1.text((width, height), text, font=myFont, fill =(255, 255, 255))
            height += ( size + 3 )
        
        # Save the edited image
        if isHeic:
            darkImg.convert('RGB').save(in_mem_file, format="JPEG")
        else:
            darkImg.save(in_mem_file, img.format if img.format else "jpeg" )
        
        in_mem_file.seek(0)

        return in_mem_file
    except :
        return oSource