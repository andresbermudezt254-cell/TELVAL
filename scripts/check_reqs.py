import os, json, urllib.request
with open('.env', 'r', encoding='utf-8') as f:
    env = {}
    for line in f:
        line=line.strip()
        if not line or line.startswith('#'): continue
        k,v=line.split('=',1)
        env[k]=v
url = env.get('VITE_SUPABASE_URL')
key = env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')
if not url or not key:
    raise SystemExit('missing env vars')
req = urllib.request.Request(
    url + '/rest/v1/requisiciones?select=id,codigo,empleado_id,estado,created_at&order=created_at.desc&limit=20',
    headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Accept': 'application/json'
    }
)
with urllib.request.urlopen(req, timeout=30) as r:
    data = r.read().decode('utf-8')
    print(data)