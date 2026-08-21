import functools
import json

def decrypt(salt, encoded):
    if not encoded:
        return None

    text_to_chars = lambda text: [ord(c) for c in text]
    apply_salt_to_char = lambda code: code ^ functools.reduce(lambda a, b: a ^ b, text_to_chars(salt), code)

    hex_values = [int(encoded[i:i + 2], 16) for i in range(0, len(encoded), 2)]
    decrypted_chars = [chr(apply_salt_to_char(char_code)) for char_code in hex_values]

    return "".join(decrypted_chars)

def encrypt(salt, text):
    if not text:
        return None

    text = json.dumps(text)
    text_to_chars = lambda text: [ord(c) for c in text]
    byte_hex = lambda n: ("0" + format(n, 'x')).zfill(2)
    apply_salt_to_char = lambda code: code ^ functools.reduce(lambda a, b: a ^ b, text_to_chars(salt), code)

    encrypted_bytes = [apply_salt_to_char(char_code) for char_code in text_to_chars(text)]
    print(encrypted_bytes)
    encrypted_hex = ''.join([byte_hex(byte) for byte in encrypted_bytes])

    # print(encrypted_hex)
    return encrypted_hex