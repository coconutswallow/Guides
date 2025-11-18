---
layout: doc
title: Site Map & Content Index
permalink: /help/site-map/
order: 21 
---

# Site Map & Content Index

This index lists all documentation pages categorized by their collection. The Monster Compendium, DM's Guide, and Arcana are excluded as they are external links or use custom indexing. Pages are ordered by the **`order`** key defined in their front matter.

---

{% comment %}
    Iterate over all defined collections in the site's configuration
{% endcomment %}
{% for collection in site.collections %}
  {% comment %}
    EXCLUSION LIST: 
    - posts/data: Standard Jekyll internal collections.
    - monsters: Excluded as requested (special handling).
    - dms_guide/arcana/resources: Defined as external links or content in _config.yml
  {% endcomment %}
  {% unless collection.label == 'posts' or collection.label == 'data' or collection.label == 'monsters' or collection.label == 'dms_guide' or collection.label == 'arcana' or collection.label == 'resources' %}
    
    {% comment %} Filter for documents that have a title or a URL (i.e., they are renderable pages) {% endcomment %}
    {% assign collection_pages = collection.docs | where_exp: "page", "page.title != null or page.url != null" %}
    
    {% comment %} Sort the resulting pages by the 'order' variable in the front matter {% endcomment %}
    {% assign sorted_pages = collection_pages | sort: 'order' %}

    {% if sorted_pages.size > 0 %}
        {% comment %} 
            Header for the collection, with clean title formatting
        {% endcomment %}
        ## 📚 {{ collection.label | capitalize | replace: 'Dms_guide', "DM's Guide" | replace: 'Playersguide', "Player's Guide" | replace: '_', ' ' }}
        
        | Order | Title | URL Path |
        | :---: | :--- | :--- |
        {% for page in sorted_pages %}
            {% comment %} 
                Display the order number. Default to a hyphen if 'order' is not set.
            {% endcomment %}
            {% assign order_display = page.order | default: "-" %}

            | **{{ order_display }}** | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
        {% endfor %}

        ---
    {% endif %}
  {% endunless %}
{% endfor %}


## 📌 Top-Level Standalone Pages

These pages are not part of a documentation collection.

| Title | URL Path |
| :--- | :--- |
{% assign standalones = site.html_pages | where_exp: "page", "page.collection == null and page.url != '/404.html'" | sort: 'title' %}
{% for page in standalones %}
  {% comment %} Exclude internal Jekyll files and the sitemap itself {% endcomment %}
  {% unless page.url contains '/monster-compendium/' or page.url contains '/help/site-map/' %}
    | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
  {% endunless %}
{% endfor %}