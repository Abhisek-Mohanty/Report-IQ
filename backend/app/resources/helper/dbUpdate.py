import re
from datetime import timedelta
from datetime import datetime

def removecomments(sql_script):
    sql_script = re.sub(r'--.*\n', '', sql_script)
    sql_script = re.sub(r'@@.*\n', '', sql_script)  
    sql_script = re.sub(r'/\*.*?\*/', '', sql_script, flags=re.DOTALL)
    return sql_script

def checkDate(sql_script):
    pass

def findLastParttern(sql_script,index):
    # modification_comment_pattern = re.compile(r'\b[A-Z]{4}-\d{4}-[A-Z]{4}\b')
    lines = sql_script.splitlines()
    filtered_lines = []
    # found_modification_comment = False
    # matches = modification_comment_pattern.findall(sql_script)
    # last_match= matches[index]
    for line in lines:
        # if found_modification_comment:
        filtered_lines.append(line)
        # else:
            # match = modification_comment_pattern.search(line)
            # if match:
            #     if match.group(0) == last_match:
            #         found_modification_comment = True
    
    return "\n".join(filtered_lines)


def cleanup_sql_script(sql_script):
    lines = [line.strip() for line in sql_script.splitlines() if line.strip()]
    cleaned_script = '\n'.join(lines)
    return cleaned_script


def split_sql_script(sql_script):
    statements = sql_script.split(';')
    statements = [statement.strip() for statement in statements if statement.strip()]
    return statements

# def find_last_date(sql_script):
#     modification_comment_pattern = re.compile(r'\d{4}-\d{2}-\d{2}')
#     lines = sql_script.splitlines()
#     pattern_match=[]

#     for line in lines:
#         match = modification_comment_pattern.search(line)
#         if match is not None:
#             pattern_match.append(match.group(0))
#     print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@pattern_match[len(pattern_match) - 1]",pattern_match[len(pattern_match) - 1])

#     return pattern_match[len(pattern_match) - 1]