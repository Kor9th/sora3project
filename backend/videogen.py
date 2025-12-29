import os
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"backend\.env")

SORA_ENDPOINT= os.getenv("SORA_ENDPOINT")
SORA_KEY= os.getenv("SORA_KEY")


"""curl -X POST "https://josephisharufe-2805-resource.cognitiveservices.azure.com/openai/v1/video/generations/jobs?api-version=preview" \
  -H "Content-Type: application/json" \
  -H "Api-key: $AZURE_API_KEY" \
  -d '{
     "model": "sora",
     "prompt" : "A video of a cat",
     "height" : "1080",
     "width" : "1080",
     "n_seconds" : "5",
     "n_variants" : "1"
    }'"""

RAW_ENDPOINT = SORA_ENDPOINT.split('?')[0] 
API_VERSION = "preview"

def request_video(prompt:str):
    headers ={"api-key":SORA_KEY, "Content-Type":"application/json"}
    payload = {
        "prompt":prompt,
        "model":'sora',
        "height" : 720,
        "width" : 720,
        "n_seconds" : 2,
        "n_variants" : 1
        }

    response = requests.post(SORA_ENDPOINT,headers=headers,json=payload)

    if response.status_code in[201,202]:
        return response.json()
    else:
        print(f"DEBUG: Azure responded with {response.status_code}:{response.text}")
        raise Exception("Failed to connect")
    
def get_generation_status(id: str):
    poll_url = f"{RAW_ENDPOINT}/{id}?api-version={API_VERSION}"
    headers = {"api-key": SORA_KEY}

    response = requests.get(poll_url, headers=headers)
   
    data = response.json()
    
    print(f"DEBUG Polling: Status Code {response.status_code} | Data: {data}")
    
    return data
