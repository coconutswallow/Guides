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
|`https://docs.google.com/spreadsheets/d/13x8hrf6-3-dst0Gj9lFsHAtxQHQPS2kIreVQMY7oeiw/edit?usp=sharing`| Google Sheet where CGs can maintain the FAQ easily, and then we use the tool to convert to a yml |

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

### Prerequisites

- **Python 3.x** installed.
    
- **Dependencies:** The `ruamel.yaml` library is required to preserve block formatting.
    
    ```
    # First time setup
    python -m pip install ruamel.yaml
    ```
    

### Step-by-Step Update Process

#### 1. Edit the Spreadsheet

[Google Sheet](https://docs.google.com/spreadsheets/d/13x8hrf6-3-dst0Gj9lFsHAtxQHQPS2kIreVQMY7oeiw/edit?usp=sharing)

- `category` (e.g., General, Rules, Downtime)
   
- `question` (Plain text)
    
- `answer` (HTML allowed)
    

**Important Formatting Rules:**

- **Newlines:** Do not press Enter inside a cell. Use the character sequence `\n` to indicate a paragraph break.
    
- **Links:** Use standard HTML anchors: `<a href="...">Link</a>` or `[name of the link](link url)`.  Note I tried to use relative internal links, but it doesn't work.  Adding code to try to accomodate it became too complex for what it's worth.
    
- **No Tabs:** Do not use tab characters within the text.
   

#### 2. Export to TSV

File > Download > Tab-separated values (.tsv).  it will be named `faqs - Sheet1.tsv` by default

Save the file as `faqs - Sheet1.tsv` in the same folder as the Python script. (`/tools)`)
    

#### 3. Run the Converter

Execute the script to generate the production YAML file (via your command prompt)

```
python convert_faq.py
```

- **Input:** `tools/faqs - Sheet1.tsv` (or root, depending on script config)  
- **Output:** `_data/faqs.yml`
    

#### 4. Verify and Commit

Check `_data/faqs.yml` to ensure the formatting looks correct. 


#### 5. Push to Github
