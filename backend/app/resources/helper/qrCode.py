
import qrcode
from io import BytesIO 
import base64 
from PIL import Image

class QRCode():
    
    def getQR(self, data : any):
        try:
            img = qrcode.make( data = data, version=1, box_size=8, border=1 ) 
            img = img.convert("RGB")
            
            watermark = Image.open("./app/images/techfino.jpg")
            qr_width, qr_height = img.size
            max_size = min(qr_width, qr_height) // 5
            watermark = watermark.resize((max_size, max_size))
            watermark_width, watermark_height = watermark.size
            position = ((qr_width - watermark_width) // 2, (qr_height - watermark_height) // 2)
            img.paste(watermark, position)
            
            
            # img.save("./app/images/qrcode.png", format="PNG")
            buffer = BytesIO() 
            img.save(buffer, format="PNG") 
            qrCode = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}" 
            
            return qrCode
        except Exception as error:
            return None 
        