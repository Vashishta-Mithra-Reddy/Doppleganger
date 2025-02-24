from http.server import BaseHTTPRequestHandler
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Script loaded")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        logger.info("Received POST request")
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'message': 'Hello from Python!'}).encode('utf-8'))