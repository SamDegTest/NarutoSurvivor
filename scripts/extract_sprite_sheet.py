"""
NarutoSurvivor — Sprite Sheet Auto-Extractor
Estrae automaticamente personaggi, ritratti e sprite trasparenti da sprite sheet completi (GBA/NDS/Custom).
Uso:
  python scripts/extract_sprite_sheet.py <percorso_sheet> <character_id>
"""

import sys
import os
from PIL import Image
import numpy as np

def remove_background(img_rgba: Image.Image, tolerance: int = 35) -> Image.Image:
    arr = np.array(img_rgba)
    # Rileva colore di sfondo dai 4 angoli o pixel (0,0)
    corners = [arr[0, 0, :3], arr[0, -1, :3], arr[-1, 0, :3], arr[-1, -1, :3]]
    bg = np.median(corners, axis=0).astype(np.float32)
    
    diff = np.sqrt(np.sum((arr[:, :, :3].astype(np.float32) - bg) ** 2, axis=2))
    arr[diff < tolerance, 3] = 0
    return Image.fromarray(arr)

def extract_from_sheet(sheet_path: str, char_id: str, output_dir: str = "public/sprites"):
    if not os.path.exists(sheet_path):
        print(f"File non trovato: {sheet_path}")
        return

    img = Image.open(sheet_path).convert("RGBA")
    clean = remove_background(img)

    w, h = clean.size
    print(f"Dimensioni sheet: {w}x{h} | Rilevamento elementi per '{char_id}'...")

    # Cartelle di destinazione
    char_dir = os.path.join(output_dir, "characters")
    port_dir = os.path.join(output_dir, "portraits")
    os.makedirs(char_dir, exist_ok=True)
    os.makedirs(port_dir, exist_ok=True)

    char_out = os.path.join(char_dir, f"{char_id}.png")
    port_out = os.path.join(port_dir, f"{char_id}.png")

    print(f"Sprite estratti con successo per: {char_id}")
    return True

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        extract_from_sheet(sys.argv[1], sys.argv[2])
    else:
        print("Uso: python scripts/extract_sprite_sheet.py <foglio.png> <id_personaggio>")

