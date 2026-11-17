# Serveur local sans cache : evite de voir d'anciennes versions des fichiers JS.
# Usage : python serve.py   puis ouvrir http://localhost:8000
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

ThreadingHTTPServer(('', 8000), NoCache).serve_forever()
