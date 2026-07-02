from io import BytesIO
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/")
def test():
    out = BytesIO(b"hello world")
    out.seek(0)
    return StreamingResponse(out)

client = TestClient(app)
res = client.get("/")
print("STATUS:", res.status_code)
print("BODY:", res.content)
