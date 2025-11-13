---
layout: doc
title: "FAQ Engineering Notes"
order: 20
---

# FAQ Feature Engineering Notes

## 1. Overview

The FAQ page is a **static, client-side searchable** interface. It generates content at build time using Jekyll data files but handles search and filtering dynamically in the browser using **Alpine.js**.

This approach ensures the page is SEO-friendly (all content is in the initial HTML) while remaining instant for the user (no page reloads when filtering).

## 2. Architecture & File Structure

### Key Files

|   |   |
|---|---|
|**File**|**Description**|
|`faq.html`|The main page template. Contains the Alpine.js logic and Jekyll Liquid loops.|
|`_data/faqs.yml`|The source of truth. Contains all questions, answers, and categories.|
|`assets/css/faq.css`|Specific styles for the FAQ page (loaded via `extra_css` front matter).|
|`/tools/convert_faq.py`|Utility script to convert Spreadsheet exports (TSV) into the YAML format.|

### Logic Flow

1. **Build Time:** Jekyll reads `_data/faqs.yml` and loops through it in `faq.html`. It renders every single FAQ item into the DOM.
    
2. **Run Time:** Alpine.js initializes with `{ searchTerm: '', selectedCategory: 'all' }`.
    
3. **Interactivity:**
    
    - **Search:** The `input` binds to `searchTerm`.
        
    - **Filter:** Buttons bind to `selectedCategory`.
        
    - **Visibility:** Each FAQ item has an `x-show` directive that evaluates:
        
        ```
        (categoryMatch) && (searchMatch)
        ```
        

## 3. Content Maintenance Workflow

To allow non-technical contributors to update content, we use a **Spreadsheet → TSV → Python** pipeline.

### Prerequisites

- **Python 3.x** installed.
    
- **Dependencies:** The `ruamel.yaml` library is required to preserve block formatting.
    
    ```
    # First time setup
    python -m pip install ruamel.yaml
    ```
    

### Step-by-Step Update Process

#### 1. Edit the Spreadsheet

Maintain a master spreadsheet (Google Sheets or Excel) with three columns (case sensitive):

- `category` (e.g., General, Rules, Downtime)
    
- `question` (Plain text)
    
- `answer` (HTML allowed)
    

**Important Formatting Rules:**

- **Newlines:** Do not press Enter inside a cell. Use the character sequence `\n` to indicate a paragraph break.
    
- **Links:** Use standard HTML anchors: `<a href="...">Link</a>`.
    
- **No Tabs:** Do not use tab characters within the text.
    

#### 2. Export to TSV

[Google Sheet Location](https://docs.google.com/spreadsheets/d/13x8hrf6-3-dst0Gj9lFsHAtxQHQPS2kIreVQMY7oeiw/edit?usp=sharing)

File > Download > Tab-separated values (.tsv).  it will be named `faqs - Sheet1.tsv` by default

Save the file as `faqs - Sheet1.tsv` in the same folder as the Python script. (`/tools)`)
    

#### 3. Run the Converter

Execute the script to generate the production YAML file.

```
python convert_faq.py
```

- **Input:** `tools/faqs - Sheet1.tsv` (or root, depending on script config)  
- **Output:** `_data/faqs.yml`
    

#### 4. Verify and Commit

Check `_data/faqs.yml` to ensure the formatting looks correct. 

## 4. Styling & Design

The FAQ utilizes a custom style sheet (`assets/css/faq.css`) that overrides the default "card" look of the site to be more compact.

- **Visual Style:** Uses a `border-left` accent instead of a full border to mimic the "Blockquote" style.
    
- **Typography:** Uses the body font (Source Sans) for headers instead of the decorative site header font (Cinzel) to reduce vertical height and improve scan-ability.
    
- **Dark Mode:** Fully compatible with the site's `[data-theme="dark"]` logic via CSS variables.
    
