import sys
import os

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Dependencies not met. Installing rembg and pillow...")
    os.system(sys.executable + " -m pip install rembg pillow onnxruntime")
    print("Installation complete. Reloading...")
    from rembg import remove
    from PIL import Image

input_path = sys.argv[1]
output_path = sys.argv[2]

print("Processing image for background removal...")
try:
    with Image.open(input_path) as img:
        # remove background (returns RGBA)
        output = remove(img)
        
        # create a white background
        white_bg = Image.new("RGBA", output.size, "WHITE")
        # paste the foreground using its alpha channel as mask
        white_bg.paste(output, mask=output)
        
        # save as RGB to drop the alpha channel
        white_bg.convert("RGB").save(output_path, "PNG")
    print(f"Successfully removed background and saved to {output_path}")
except Exception as e:
    print(f"Error processing image: {e}")
