---
title: Help Index
layout: doc
order: 1
exclude_from_search: true
---

**Site Documentation**

### For Authors:
- <a href="{{ 'help/site-editor/' | relative_url }}">Site Page Editing tool</a>
- <a href="{{ 'help/markdown/' | relative_url }}">Markdown Author's Guide</a>
- <a href="{{ 'help/sitemap/' | relative_url }}">Site Map to help you figure out the page orders quickly</a>

### For Engineers

#### Standard Pages

The intention of the site design is that maintenance of the content is "low-tech".  Most of it is designed to work automatically, but here are a few things to know to customize the site:

- <a href="{{ 'help/collections/' | relative_url }}">Collections & Configuring the Site Navigation</a>
- <a href="{{ 'help/colors/' | relative_url }}">Site Color Schemes (Light/Dark)</a>
- <a href="{{ 'help/site-images/' | relative_url }}">Site Images</a>

#### Custom Pages

- <a href="{{ 'help/homepage' | relative_url }}">Main Site Home Page</a>
- <a href="{{ 'help/monsters' | relative_url }}">Monster Compendium Customer Pages</a>
- <a href="{{ 'help/FAQ-engineering' | relative_url }}">FAQ</a>

---

#### External Components

I tried not to, but there are a few external components used for super complicated stuff

##### lunnr.js 
(/assets/js/lunr.js)

This is a library that adds universal search to the the whole site.  It's not the best universal search out there, but it works. and it's free.
BUT.... `/assets/js/search.js` together with `search.json` is where you can set some parameters for the search.  I have it set to prioritize the Title first, then headers, then body for search. 

##### Deecapbridge CMS
This is the editor that I have plugged into the back-end so that users can edit the pages directly without going through git-hub.  It's primarily configured by the files in `/admin`



