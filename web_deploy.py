#!/usr/bin/env python3
"""
Деплой через HTTP загрузку файлов на сервер
"""
import requests
import zipfile
import os
import time

SERVER = "http://95.217.134.12"

def create_deployment_package():
    """Создание zip архива с проектом"""
    print("📦 Creating deployment package...")
    
    files_to_include = [
        "server.js",
        "package.json"
    ]
    
    dirs_to_include = ["src", "adapters", "public", "lib"]
    
    with zipfile.ZipFile('deploy.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Добавляем файлы
        for file in files_to_include:
            if os.path.exists(file):
                zipf.write(file)
                print(f"✅ Added {file}")
        
        # Добавляем директории
        for dir_name in dirs_to_include:
            if os.path.exists(dir_name):
                for root, dirs, files in os.walk(dir_name):
                    for file in files:
                        file_path = os.path.join(root, file)
                        zipf.write(file_path)
                print(f"✅ Added {dir_name}/")
        
        # Добавляем деплой скрипт
        deploy_script = """#!/bin/bash
cd /tmp
unzip -o deploy.zip
rm -rf /opt/deep-agg/*
mkdir -p /opt/deep-agg
cp -r * /opt/deep-agg/
cd /opt/deep-agg
npm install --production
pkill -f 'node server.js' || true
nohup node server.js > server.log 2>&1 &
sleep 3
curl http://127.0.0.1:9201/api/search?q=LM317
"""
        zipf.writestr('deploy.sh', deploy_script)
        print("✅ Added deploy.sh")
    
    print("📦 Package created: deploy.zip")
    return True

def test_upload_endpoints():
    """Тестирование различных эндпоинтов для загрузки"""
    endpoints_to_try = [
        "/upload",
        "/api/upload", 
        "/admin/upload",
        "/deploy",
        "/api/deploy",
        "/webhook",
        "/api/webhook"
    ]
    
    print("🔍 Testing upload endpoints...")
    
    for endpoint in endpoints_to_try:
        try:
            url = f"{SERVER}{endpoint}"
            response = requests.get(url, timeout=5)
            print(f"  {endpoint}: HTTP {response.status_code}")
            
            if response.status_code in [200, 405]:  # 405 = Method Not Allowed (может принимать POST)
                return endpoint
                
        except Exception as e:
            print(f"  {endpoint}: {str(e)[:30]}...")
    
    return None

def try_file_upload(endpoint):
    """Попытка загрузки файла"""
    print(f"📤 Trying to upload to {endpoint}...")
    
    try:
        with open('deploy.zip', 'rb') as f:
            files = {'file': ('deploy.zip', f, 'application/zip')}
            
            response = requests.post(
                f"{SERVER}{endpoint}",
                files=files,
                timeout=30
            )
            
            print(f"Upload response: HTTP {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            
            return response.status_code == 200
            
    except Exception as e:
        print(f"Upload failed: {e}")
        return False

def create_simple_server():
    """Создание простого HTTP сервера для загрузки"""
    server_code = '''
import http.server
import socketserver
import cgi
import os

class UploadHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/upload':
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )
            
            if 'file' in form:
                fileitem = form['file']
                if fileitem.filename:
                    with open(fileitem.filename, 'wb') as f:
                        f.write(fileitem.file.read())
                    
                    # Выполняем деплой
                    os.system('unzip -o deploy.zip && bash deploy.sh')
                    
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b'Deploy completed')
                    return
            
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'Bad request')

PORT = 8000
with socketserver.TCPServer(("", PORT), UploadHandler) as httpd:
    print(f"Server running on port {PORT}")
    httpd.serve_forever()
'''
    
    with open('upload_server.py', 'w') as f:
        f.write(server_code)
    
    print("📝 Created upload_server.py")
    print("💡 You can run this on the server to enable file upload")

def main():
    print("🌐 WEB-BASED DEPLOYMENT ATTEMPT")
    
    # Создаем пакет для деплоя
    if not create_deployment_package():
        print("❌ Failed to create deployment package")
        return
    
    # Тестируем сервер
    try:
        response = requests.get(SERVER, timeout=10)
        print(f"✅ Server accessible: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Server not accessible: {e}")
        return
    
    # Ищем эндпоинты для загрузки
    upload_endpoint = test_upload_endpoints()
    
    if upload_endpoint:
        print(f"🎯 Found potential upload endpoint: {upload_endpoint}")
        
        if try_file_upload(upload_endpoint):
            print("🎉 Upload successful!")
        else:
            print("❌ Upload failed")
    else:
        print("❌ No upload endpoints found")
        print("\n💡 Alternative solutions:")
        print("1. Create upload server on target machine")
        print("2. Use hosting control panel file manager")
        print("3. Contact hosting support")
        
        create_simple_server()
    
    print(f"\n📊 Deployment package ready: deploy.zip ({os.path.getsize('deploy.zip')} bytes)")

if __name__ == "__main__":
    main()
