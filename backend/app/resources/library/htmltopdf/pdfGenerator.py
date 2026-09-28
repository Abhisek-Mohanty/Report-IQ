import os
import io
from app.resources.library.S3.index import s3Bucket
from app.core.config import ENVIRONMENT
from app.resources.library.htmltopdf import pdfkit as awsPdfkit
import pdfkit as winPdfkit
import subprocess
import urllib.parse

def html_to_data_uri(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    return f"data:text/html,{urllib.parse.quote(content)}"

async def generate_pdf_from_html(template_string : any , data, file_name_with_path, on_letter_head = False):
    try:
        rendered_template = template_string
        if data:
            template_data = template_string.replace('\n', '')
            rendered_template = template_data % data
        
        BASE_DIR = os.path.dirname(os.path.realpath(__file__))
        here = lambda *x: os.path.abspath(os.path.join(BASE_DIR, *x))
        # binary_path = here('wkhtmltox-0.12.6/bin/wkhtmltopdf')
        binary_path = here('wkhtmltopdf')
        
        pdfkit = awsPdfkit
        if ENVIRONMENT == "DEV":
            pdfkit = winPdfkit
                
        config = awsPdfkit.configuration(wkhtmltopdf=binary_path) #replace with your path
        if ENVIRONMENT == "DEV":
            binary_path = here('wkhtmltopdf')
            config = pdfkit.configuration(wkhtmltopdf=binary_path+".exe") #replace with your path
        
        
        file_content = None
        options = {
                'page-size': 'A4',
                'dpi': 400,
                '--margin-top': '0.75in',
                '--margin-right': '0.5in',
                '--margin-left': '0.5in',
                '--margin-bottom': '0.75in',
            }
        if on_letter_head:
            options['--header-html'] = './header.html'
            options['--header-line'] = ''
            options['--footer-html'] = './footer.html'
            
        if ENVIRONMENT == "DEV":
            options = {
                'page-size': 'A4',
                'dpi': 400,
                '--margin-top': '0.75in',
                '--margin-right': '0.5in',
                '--margin-left': '0.5in',
                '--margin-bottom': '0.75in',
            }
            if on_letter_head:
                options['--header-html'] = './header.html'
                options['--header-line'] = ''
                options['--footer-html'] = './footer.html'
            file_content = pdfkit.from_string( rendered_template, False, configuration=config, options=options)
        else:
            options = [
                "wkhtmltopdf",
                '--page-size', 'A4',
                '--dpi', "400",
                '--margin-top', '0.75in',
                '--margin-right', '0.5in',
                '--margin-left', '0.5in',
                '--margin-bottom', '0.75in'
            ]
            if on_letter_head:
                options.append(*[
                                "--header-html", html_to_data_uri('header.html'),
                                "--footer-html", html_to_data_uri('footer.html')
                            ])
                
            file_content = subprocess.check_output([
                *options,
                "-",
                "-"
            ],
            input=rendered_template.encode("utf-8"),
            stderr=subprocess.PIPE
            ) 
        
        if file_name_with_path:
            oS3 = s3Bucket()
            file_name_with_path = await oS3.upload(file=file_content, filename=file_name_with_path, fixedName= True)
            return file_name_with_path
        else:
            return file_content
    except BaseException as error:
        print(error)
        raise error
    
async def generate_pdf(template, data = None, file_name_with_path = None, on_letter_head=False):
    try:
        if data:
            with open(template, 'r') as template_file:
                return await generate_pdf_from_html(template_file.read(), data, file_name_with_path, on_letter_head)
        else:
            return await generate_pdf_from_html(template, data, file_name_with_path, on_letter_head)
    except BaseException as error:
        raise error