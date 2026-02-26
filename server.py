#!/usr/bin/env python3
import sqlite3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os

class CantiqueHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.db_path = os.path.join(os.path.dirname(__file__), 'hymnes')
        self.manifest_file = os.path.join(self.db_path, 'manifest.json')
        super().__init__(*args, **kwargs)
    
    def load_manifest(self):
        """Charge le manifest.json pour obtenir la liste des bases de données"""
        try:
            with open(self.manifest_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"versions": []}
    
    def get_database_list(self):
        """Retourne la liste des bases de données disponibles"""
        manifest = self.load_manifest()
        databases = []
        
        # Bases depuis le manifest
        for version in manifest.get('versions', []):
            db_file = os.path.join(self.db_path, version['file'])
            if os.path.exists(db_file):
                databases.append({
                    'file': version['file'],
                    'name': version['name'],
                    'id': version['id']
                })
        
        # Bases .db supplémentaires non déclarées dans le manifest
        try:
            for file in os.listdir(self.db_path):
                if file.endswith('.db'):
                    db_path = os.path.join(self.db_path, file)
                    if not any(db['file'] == file for db in databases):
                        databases.append({
                            'file': file,
                            'name': file.replace('.db', '').replace('_', ' ').title(),
                            'id': file.replace('.db', '')
                        })
        except FileNotFoundError:
            pass
        
        return databases
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/api/databases':
            self.handle_get_databases()
        elif self.path.startswith('/api/cantique/'):
            if '/search' in self.path:
                self.handle_search_cantique()
            else:
                self.handle_get_cantique()
        else:
            self.serve_file()
    
    def do_PUT(self):
        if self.path.startswith('/api/cantique/'):
            self.handle_update_cantique()
        else:
            self.send_error(404)
    
    def handle_get_databases(self):
        """Retourne la liste des bases de données disponibles"""
        try:
            databases = self.get_database_list()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(databases).encode())
            
        except Exception as e:
            print(f"Erreur GET databases: {e}")
            self.send_error(500, str(e))
    
    def handle_search_cantique(self):
        """Recherche des cantiques par titre"""
        try:
            path_parts = self.path.strip('/').split('/')
            if len(path_parts) < 4:
                self.send_error(400, "Format invalide")
                return
            
            database = path_parts[2]
            # Extraire le paramètre title de l'URL
            query_parts = path_parts[3].split('?')
            if len(query_parts) < 2:
                self.send_error(400, "Paramètre title manquant")
                return
            
            params = parse_qs(query_parts[1])
            title_query = params.get('title', [''])[0]
            
            if not title_query:
                self.send_error(400, "Titre de recherche vide")
                return
            
            db_file = os.path.join(self.db_path, database)
            if not os.path.exists(db_file):
                self.send_error(404, "Base de données non trouvée")
                return
            
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, c_num, c_title, c_key, c_content, C_author, c_categories
                FROM adventiste_cantique 
                WHERE c_title LIKE ?
                ORDER BY c_num
                LIMIT 20
            """, (f'%{title_query}%',))
            
            results = cursor.fetchall()
            conn.close()
            
            cantiques = []
            for result in results:
                cantiques.append({
                    'id': result[0],
                    'c_num': result[1],
                    'c_title': result[2],
                    'c_key': result[3],
                    'c_content': result[4],
                    'C_author': result[5],
                    'c_categories': result[6]
                })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(cantiques).encode())
                
        except Exception as e:
            print(f"Erreur SEARCH: {e}")
            self.send_error(500, str(e))
    
    def handle_get_cantique(self):
        try:
            path_parts = self.path.strip('/').split('/')
            if len(path_parts) < 4:
                self.send_error(400, "Format invalide")
                return
            
            database = path_parts[2]
            cantique_num = path_parts[3]
            
            db_file = os.path.join(self.db_path, database)
            if not os.path.exists(db_file):
                self.send_error(404, "Base de données non trouvée")
                return
            
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, c_num, c_title, c_key, c_content, C_author, c_categories
                FROM adventiste_cantique 
                WHERE c_num = ?
            """, (cantique_num,))
            
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
                    'c_categories': result[6]
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
    
    def handle_update_cantique(self):
        try:
            path_parts = self.path.strip('/').split('/')
            if len(path_parts) < 4:
                self.send_error(400, "Format invalide")
                return
            
            database = path_parts[2]
            cantique_num = path_parts[3]
            
            db_file = os.path.join(self.db_path, database)
            if not os.path.exists(db_file):
                self.send_error(404, "Base de données non trouvée")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            update_data = json.loads(post_data.decode())
            
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE adventiste_cantique 
                SET c_title = ?, c_key = ?, c_content = ?, C_author = ?, c_categories = ?
                WHERE c_num = ?
            """, (
                update_data.get('c_title', ''),
                update_data.get('c_key', ''),
                update_data.get('c_content', ''),
                update_data.get('C_author', 'undefined'),
                update_data.get('c_categories', 'undefined'),
                cantique_num
            ))
            
            conn.commit()
            rows_affected = cursor.rowcount
            conn.close()
            
            if rows_affected > 0:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'success': True, 'message': 'Cantique mis à jour'}
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_error(404, "Cantique non trouvé")
                
        except Exception as e:
            print(f"Erreur PUT: {e}")
            self.send_error(500, str(e))
    
    def serve_file(self):
        try:
            if self.path == '/':
                file_path = 'correction_cantique.html'
            else:
                file_path = self.path.lstrip('/')
            
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                self.send_response(200)
                if file_path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif file_path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif file_path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                else:
                    self.send_header('Content-Type', 'application/octet-stream')
                
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404)
                
        except Exception as e:
            print(f"Erreur serveur fichier: {e}")
            self.send_error(500)

def run_server():
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, CantiqueHandler)
    print("🎼 Serveur de correction de cantiques démarré!")
    print("📂 Ouvrez votre navigateur sur: http://localhost:8080")
    print("⚠️  Assurez-vous que les bases de données sont dans le dossier 'hymnes'")
    print("🛑 Pour arrêter le serveur, appuyez sur Ctrl+C")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Arrêt du serveur...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
