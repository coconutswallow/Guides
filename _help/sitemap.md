---
layout: doc
title: Site Map & Content Index
permalink: /help/site-map/
order: 21 
---

# Site Map & Content Index

This index lists only those documents using the standard `layout: doc` or `layout: default` template. Collections like the Monster Compendium (which uses `layout: statblock`), DM's Guide, and Arcana are explicitly excluded. Pages are ordered by the **`order`** key defined in their front matter.

---

{% comment %}
    1. Define the exact collection labels to include in the sitemap.
{% endcomment %}
{% assign allowed_collections = "rules, playersguide, fieldguide, help" | split: ", " %}

{% for label in allowed_collections %}
    {% assign collection = site.collections | where: "label", label | first %}
    
    {% if collection %}
        {% comment %} 
            2. CRITICAL FILTER: Only include documents that explicitly use 'doc' or 'default' layout.
            This excludes 'statblock' and any other custom layouts.
        {% endcomment %}
        {% assign collection_pages = collection.docs | where_exp: "page", "page.layout == 'doc' or page.layout == 'default'" %}
        
        {% comment %} Sort the resulting pages by the 'order' variable in the front matter {% endcomment %}
        {% assign sorted_pages = collection_pages | sort: 'order' %}

        {% if sorted_pages.size > 0 %}
            {% comment %} 
                Header for the collection, with clean title formatting
            {% endcomment %}
            {% assign clean_label = collection.label | capitalize | replace: 'Dms_guide', "DM's Guide" | replace: 'Playersguide', "Player's Guide" | replace: '_', ' ' %}

            ## 📚 {{ clean_label }}
            
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
    {% endif %}
{% endfor %}


## 📌 Top-Level Standalone Pages

These pages are not part of a documentation collection.

| Title | URL Path |
| :--- | :--- |
{% assign standalones = site.html_pages | where_exp: "page", "page.collection == null and page.url != '/404.html'" | sort: 'title' %}
{% for page in standalones %}
  {% comment %} Exclude internal Jekyll files and the sitemap itself, and special compendium pages {% endcomment %}
  {% unless page.url contains '/monster-compendium/' or page.url contains '/help/site-map/' %}
    | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
  {% endunless %}
{% endfor %}