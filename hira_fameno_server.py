#!/usr/bin/env python3
import sqlite3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os

class HiraFamenoHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.db_path = os.path.join(os.path.dirname(__file__), 'hymnes', 'hira_fameno.db')
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.serve_html()
        elif self.path == '/api/cantique':
            self.handle_list_cantiques()
        elif self.path.startswith('/api/cantique/'):
            self.handle_get_cantique()
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/cantique':
            self.handle_add_cantique()
        else:
            self.send_error(404)
    
    def do_PUT(self):
        if self.path.startswith('/api/cantique/'):
            self.handle_update_cantique()
        else:
            self.send_error(404)
    
    def do_DELETE(self):
        if self.path.startswith('/api/cantique/'):
            self.handle_delete_cantique()
        else:
            self.send_error(404)
    
    def handle_list_cantiques(self):
        """Liste tous les cantiques de la base Hira fameno"""
        try:
            if not os.path.exists(self.db_path):
                self.send_error(404, "Base de données non trouvée")
                return
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, c_num, c_title, c_key, C_author, c_categories
                FROM adventiste_cantique 
                ORDER BY c_num
            """)
            
            results = cursor.fetchall()
            conn.close()
            
            cantiques = []
            for result in results:
                cantiques.append({
                    'id': result[0],
                    'c_num': result[1],
                    'c_title': result[2],
                    'c_key': result[3],
                    'C_author': result[4],
                    'c_categories': result[5]
                })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(cantiques).encode())
                
        except Exception as e:
            print(f"Erreur LIST: {e}")
            self.send_error(500, str(e))
    
    def handle_get_cantique(self):
        """Récupère un cantique par son ID"""
        try:
            path_parts = self.path.strip('/').split('/')
            if len(path_parts) < 3:
                self.send_error(400, "Format invalide")
                return
            
            cantique_id = path_parts[2]
            
            if not os.path.exists(self.db_path):
                self.send_error(404, "Base de données non trouvée")
                return
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, c_num, c_title, c_key, c_content, C_author, c_categories, c_playbacks
                FROM adventiste_cantique 
                WHERE id = ?
            """, (cantique_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                cantique = {
                    'id': result[0],
                    'c_num': result[1],
                    'c_title': result[2],
                    'c_key': result[3],
                    'c_content': result[4],
                    'C_author': result[5],
                    'c_categories': result[6],
                    'c_playbacks': result[7]
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(cantique).encode())
            else:
                self.send_error(404, "Cantique non trouvé")
                
        except Exception as e:
            print(f"Erreur GET: {e}")
            self.send_error(500, str(e))
    
    def handle_add_cantique(self):
        """Ajoute un nouveau cantique"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            cantique_data = json.loads(post_data.decode())
            
            if not os.path.exists(self.db_path):
                self.send_error(404, "Base de données non trouvée")
                return
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO adventiste_cantique 
                (c_num, c_title, c_key, c_content, C_author, c_categories, c_playbacks)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                cantique_data.get('c_num', 0),
                cantique_data.get('c_title', ''),
                cantique_data.get('c_key', ''),
                cantique_data.get('c_content', ''),
                cantique_data.get('C_author', 'undefined'),
                cantique_data.get('c_categories', 'undefined'),
                cantique_data.get('c_playbacks', '')
            ))
            
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'success': True, 'message': 'Cantique ajouté', 'id': new_id}
            self.wfile.write(json.dumps(response).encode())
                
        except Exception as e:
            print(f"Erreur POST: {e}")
            self.send_error(500, str(e))
    
    def handle_update_cantique(self):
        """Modifie un cantique existant"""
        try:
            path_parts = self.path.strip('/').split('/')
            if len(path_parts) < 3:
                self.send_error(400, "Format invalide")
                return
            
            cantique_id = path_parts[2]
            
            if not os.path.exists(self.db_path):
                self.send_error(404, "Base de données non trouvée")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            update_data = json.loads(post_data.decode())
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE adventiste_cantique 
                SET c_num = ?, c_title = ?, c_key = ?, c_content = ?, 
                    C_author = ?, c_categories = ?, c_playbacks = ?
                WHERE id = ?
            """, (
                update_data.get('c_num', 0),
                update_data.get('c_title', ''),
                update_data.get('c_key', ''),
                update_data.get('c_content', ''),
                update_data.get('C_author', 'undefined'),
                update_data.get('c_categories', 'undefined'),
                update_data.get('c_playbacks', ''),
                cantique_id
            ))
            
            conn.commit()
            rows_affected = cursor.rowcount
            conn.close()
            
            if rows_affected > 0:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'message': 'Cantique modifié'}
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_error(404, "Cantique non trouvé")
                
        except Exception as e:
            print(f"Erreur PUT: {e}")
            self.send_error(500, str(e))
    
    def handle_delete_cantique(self):
        """Supprime un cantique"""
        try:
            path_parts = self.path.strip('/').split('/')
            if len(path_parts) < 3:
                self.send_error(400, "Format invalide")
                return
            
            cantique_id = path_parts[2]
            
            if not os.path.exists(self.db_path):
                self.send_error(404, "Base de données non trouvée")
                return
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM adventiste_cantique WHERE id = ?", (cantique_id,))
            
            conn.commit()
            rows_affected = cursor.rowcount
            conn.close()
            
            if rows_affected > 0:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'message': 'Cantique supprimé'}
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_error(404, "Cantique non trouvé")
                
        except Exception as e:
            print(f"Erreur DELETE: {e}")
            self.send_error(500, str(e))
    
    def serve_html(self):
        """Sert la page HTML principale"""
        try:
            html_path = os.path.join(os.path.dirname(__file__), 'hira_fameno.html')
            if not os.path.exists(html_path):
                self.send_error(404, "Fichier HTML non trouvé")
                return
            
            with open(html_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
                
        except Exception as e:
            print(f"Erreur serve HTML: {e}")
            self.send_error(500, str(e))

def run_server():
    server_address = ('', 8081)
    httpd = HTTPServer(server_address, HiraFamenoHandler)
    print("🎵 Serveur Hira Fameno démarré!")
    print("📂 Base de données: hymnes/hira_fameno.db")
    print("🌐 API disponibles:")
    print("   GET  /api/cantique - Lister tous les cantiques")
    print("   GET  /api/cantique/{id} - Récupérer un cantique")
    print("   POST /api/cantique - Ajouter un cantique")
    print("   PUT  /api/cantique/{id} - Modifier un cantique")
    print("   DELETE /api/cantique/{id} - Supprimer un cantique")
    print("📡 Ouvrez votre navigateur sur: http://localhost:8081")
    print("🛑 Pour arrêter le serveur, appuyez sur Ctrl+C")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Arrêt du serveur...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
