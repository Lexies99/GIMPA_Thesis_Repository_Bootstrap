import os, glob
from PIL import Image

media_dir = r'C:\Users\15406\.gemini\antigravity-ide\brain\c17f9551-ed51-4756-98c8-a4ec77876fc6\.tempmediaStorage'
files = sorted(glob.glob(os.path.join(media_dir, '*.png')), key=os.path.getmtime)

print(f"Total screenshots: {len(files)}")
for i, f in enumerate(files):
    size = os.path.getsize(f)
    try:
        im = Image.open(f)
        dims = im.size
    except:
        dims = (0,0)
    print(f"[{i:03d}] {os.path.basename(f)} - {dims[0]}x{dims[1]} ({size/1024:.1f} KB)")
