import json
from app.core.config import VPD_CRYPTOGRAPHY_KEY
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import base64

key = VPD_CRYPTOGRAPHY_KEY.encode()

def aesEncryptECB(encryptData):
    cipher = Cipher(algorithms.AES(key), modes.ECB(), backend=default_backend())
    encryptor = cipher.encryptor()
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(encryptData.encode()) + padder.finalize()
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    ciphertext_base64 = base64.b64encode(ciphertext).decode()
    return ciphertext_base64

def aesDecryptECB(decryptData):
    ciphertext = base64.b64decode(decryptData)
    cipher = Cipher(algorithms.AES(key), modes.ECB(), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted_data_padded = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    decrypted_data = unpadder.update(decrypted_data_padded) + unpadder.finalize()
    decrypted_response = json.loads(decrypted_data.decode())
    return decrypted_response