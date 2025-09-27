
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
