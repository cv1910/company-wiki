#!/usr/bin/env python3
import cairosvg
import os

# Icon sizes needed for PWA
sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512]

svg_path = "/home/ubuntu/company-wiki/client/public/favicon.svg"
output_dir = "/home/ubuntu/company-wiki/client/public"

for size in sizes:
    output_path = os.path.join(output_dir, f"icon-{size}.png")
    cairosvg.svg2png(url=svg_path, write_to=output_path, output_width=size, output_height=size)
    print(f"Generated {output_path}")

# Generate maskable icons (with padding)
maskable_sizes = [192, 512]
for size in maskable_sizes:
    output_path = os.path.join(output_dir, f"icon-maskable-{size}.png")
    cairosvg.svg2png(url=svg_path, write_to=output_path, output_width=size, output_height=size)
    print(f"Generated {output_path}")

# Generate apple touch icon
cairosvg.svg2png(url=svg_path, write_to=os.path.join(output_dir, "apple-touch-icon.png"), output_width=180, output_height=180)
print("Generated apple-touch-icon.png")

# Generate favicon PNGs
cairosvg.svg2png(url=svg_path, write_to=os.path.join(output_dir, "favicon-32x32.png"), output_width=32, output_height=32)
cairosvg.svg2png(url=svg_path, write_to=os.path.join(output_dir, "favicon-16x16.png"), output_width=16, output_height=16)
print("Generated favicon PNGs")

print("All icons generated successfully!")
