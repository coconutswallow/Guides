---
layout: doc
title: Monster-Compendium
order: 34
exclude_from_search: true
---

**Monster Compendium Engineering Notes**

The monster compendium is - and will most likely be the most complex part of the site; but once built the objective is that it's 90% automated and require minimum tech maintenance.

## Functional Design

- monsters are created using a markdown format similar to homebrewery 2024 statblock format (with additional meta data used for indexing)
- once monsters are dropped into `_monster` folder, it will automatically get indexed, and show up in the monster compendium page and formatted
- to ensure the markdown file is compiled in the right format that is machine (and human) readable, DMs **must** use the Markdown Building tool to create the markdown file. 

A sample template of the markdown format can be found here <a href="{{ 'tools/monster-template.md' | relative_url }}">Sample Monster Markdown</a>

### Intended Workflow

1. DM uses the Markdown Building Tool to create their homebrew monster
2. They download the markdown file
3. They make a request in `#dm-request` and attach the file
4. If needed,  the tool can load the same markdown for editing
5. Once approved, admin moves the final file to the `_monsters` folder and it render in a few minutes

## Engineering Notes

### Key folders & files

* `/_monsters` Where all the monster markdown are stored
* `/monster-compendium/` 
	* `index.html` This page does both the index page (where you search and filter for the monster) and renders the statblocks visually
	* `generator.html` This is the Markdown Generator Tool
	* `monster-submit.html` Basically outlines the intended workflow described above
- `/assets/css/`
	- `statblock.css`
	- `generator.css`
- `/assets/js/` Javascripts - see table

| script                | description                                                                                                 |
| :-------------------- | :---------------------------------------------------------------------------------------------------------- |
| monster-controller.js | This is the main controller that calls the functions in the other files. Got to big to debug so broke it up |
| monster-ui.js         | Controls the UI including the form behavior and the preview                                                 |
| monster-parser.js     | Handles the parsing for loading markdowns                                                                   |
| monster-validator.js  | Handles the validation of the markdown before saving                                                        |
| monster-validator.js  | Handles the validation of the markdown before saving                                                        |
| monster-generator.js  | Handles the saving of the markdown in the right format                                                      |


### Note

The monsters converted originally won't work with the Generator (won't load correctly).  They will still render,  but we'd have to fix the markdown with consistent formatting to load with the generator.





