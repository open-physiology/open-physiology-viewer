import fitz  # PyMuPDF
import os

def extract_odd_pages(pdf_path, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        print(f"Created folder: {output_folder}")

    # Open the PDF
    doc = fitz.open(pdf_path)
    
    print(f"Total pages in PDF: {len(doc)}")
    
    # Iterate through the pages
    for page_index in range(len(doc)):
        # Human-readable page number (1-indexed)
        page_num = page_index + 1
        
        # Check if it's an odd page
        if page_num % 2 != 0:
            page = doc.load_page(page_index)
            # Render page to an image (pixmap)
            pix = page.get_pixmap()
            
            output_filename = f"slice_{page_num:03d}.png"
            output_path = os.path.join(output_folder, output_filename)
            
            # Save the image
            pix.save(output_path)
            print(f"Saved: {output_path}")

    doc.close()
    print("Extraction complete.")

if __name__ == "__main__":
    input_pdf = os.path.join("scripts", "data", "input", "torso.pdf")
    output_dir = os.path.join("scripts", "data", "output", "torso_images")
    
    if os.path.exists(input_pdf):
        extract_odd_pages(input_pdf, output_dir)
    else:
        print(f"Error: Could not find {input_pdf}")
