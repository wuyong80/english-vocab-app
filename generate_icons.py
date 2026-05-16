#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate PWA icons from SVG"""
import os
import base64

def generate_icon(size, output_path):
    """Generate a PNG icon by rendering SVG via Cairo or using a simple approach"""
    # For simplicity, we'll create SVG files that can be used directly
    # Modern browsers support SVG icons, but for full compatibility we'll use a data URI approach
    
    # Create a simple, clean book/learning themed icon
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90D9"/>
      <stop offset="100%" style="stop-color:#357ABD"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <rect width="512" height="512" rx="128" ry="128" fill="url(#bg)"/>
  <!-- Book icon -->
  <path d="M128 128 L128 384 L256 352 L384 384 L384 128 L256 160 Z" 
        fill="none" stroke="white" stroke-width="24" stroke-linejoin="round"/>
  <path d="M128 128 L256 160 L384 128" 
        fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <path d="M256 160 L256 352" 
        fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/>
  <!-- ABC text -->
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="72" 
        font-weight="bold" fill="white" text-anchor="middle">ABC</text>
</svg>'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Generated: {output_path}")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(base_dir, 'assets', 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generate SVG icons (browsers can use these directly)
    generate_icon(192, os.path.join(icons_dir, 'icon-192.svg'))
    generate_icon(512, os.path.join(icons_dir, 'icon-512.svg'))
    
    # Also generate a simple favicon
    favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" ry="128" fill="#4A90D9"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="240" 
        font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>'''
    
    with open(os.path.join(icons_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(favicon_svg)
    print(f"Generated favicon.svg")
    
    # Generate an ICO file using Python's built-in capabilities
    try:
        from PIL import Image
        # Create a simple 32x32 PNG for favicon
        img = Image.new('RGBA', (32, 32), (74, 144, 217, 255))
        img.save(os.path.join(icons_dir, 'favicon.ico'), format='ICO')
        print(f"Generated favicon.ico")
    except ImportError:
        print("PIL not available, skipping ICO generation")
        # Create a simple PNG fallback
        try:
            import subprocess
            # Try using ImageMagick if available
            subprocess.run(['convert', '-size', '32x32', 'xc:#4A90D9', 
                          os.path.join(icons_dir, 'favicon.ico')], check=False)
        except:
            pass

if __name__ == '__main__':
    main()
