import json

path = "/home/programmeur/Bureau/Workspace/adventools-data/docs/manifest.json"
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

old_departments = data.get("departments", [])

if isinstance(old_departments[0], str):
    new_departments = []
    
    mapping = {
        "Pasteur": {"id": "pasteur", "mg": "Mpitandrina", "en": "Pastor"},
        "Ancien": {"id": "ancien", "mg": "Loholona", "en": "Elder"},
        "Diacre": {"id": "diacre", "mg": "Diakona", "en": "Deacon"},
        "Diaconesse": {"id": "diaconesse", "mg": "Diakonisa", "en": "Deaconess"},
        "École du Sabbat": {"id": "ecole_sabbat", "mg": "Sekoly Sabata", "en": "Sabbath School"},
        "Jeunesse (AJA)": {"id": "jeunesse", "mg": "Tanora (AJA)", "en": "Youth"},
        "Ministères de la Femme": {"id": "mifem", "mg": "Minisiteran'ny Vehivavy", "en": "Women's Ministries"},
        "Ministères de l'Enfant": {"id": "mienf", "mg": "Minisiteran'ny Ankizy", "en": "Children's Ministries"},
        "Publication": {"id": "publication", "mg": "Fampielezam-boky", "en": "Publishing"},
        "Communication": {"id": "communication", "mg": "Serasera", "en": "Communication"},
        "Santé": {"id": "sante", "mg": "Fahasalamana", "en": "Health"},
        "Trésorerie": {"id": "tresorerie", "mg": "Firim-bolam-piangonana", "en": "Treasury"},
        "Secrétariat": {"id": "secretariat", "mg": "Sekretariat", "en": "Secretariat"},
        "Musique": {"id": "musique", "mg": "Mozika", "en": "Music"},
        "Ministères Personnels": {"id": "mip", "mg": "Asa Fitoriana", "en": "Personal Ministries"},
        "Éducation": {"id": "education", "mg": "Fanabeazana", "en": "Education"},
        "Membre": {"id": "membre", "mg": "Mpikambana", "en": "Member"}
    }
    
    for dept_str in old_departments:
        m = mapping.get(dept_str, {"id": dept_str.lower().replace(" ", "_"), "mg": dept_str, "en": dept_str})
        new_departments.append({
            "id": m["id"],
            "translations": {
                "fr": dept_str,
                "mg": m["mg"],
                "en": m["en"]
            }
        })
        
    data["departments"] = new_departments
    
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print("Successfully converted departments to objects.")
else:
    print("Departments are already objects.")
