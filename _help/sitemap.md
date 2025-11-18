---
layout: doc
title: Site Map & Content Index
permalink: /help/site-map/
nav_order: 100 
---

# Site Map & Content Index

This index lists all documentation pages categorized by their collection. Pages are ordered by the `nav_order` defined in their front matter. Pages without a `nav_order` appear last within their section and are marked with a hyphen (-).

---

{% comment %}
    Iterate over all defined collections in the site's configuration
{% endcomment %}
{% for collection in site.collections %}
  {% unless collection.label == 'posts' or collection.label == 'data' or collection.label == 'monsters' or collection.label == 'dms_guide' or collection.label == 'arcana' %}
    
    {% comment %} Filter for documents that have a title and a URL (i.e., they are renderable pages) {% endcomment %}
    {% assign collection_pages = collection.docs | where_exp: "page", "page.title != null or page.url != null" %}
    
    {% comment %} Sort the resulting pages by the 'nav_order' variable in the front matter {% endcomment %}
    {% assign sorted_pages = collection_pages | sort: 'nav_order' %}

    {% if sorted_pages.size > 0 %}
        {% comment %} 
            Header for the collection, with clean title formatting
        {% endcomment %}
        ## 📚 {{ collection.label | capitalize | replace: 'Dms_guide', "DM's Guide" | replace: 'Playersguide', "Player's Guide" | replace: '_', ' ' }}
        
        | Order | Title | URL Path |
        | :---: | :--- | :--- |
        {% for page in sorted_pages %}
            {% comment %} 
                Display the order number. Default to a hyphen if nav_order is not set.
            {% endcomment %}
            {% assign order_display = page.nav_order | default: "-" %}

            | **{{ order_display }}** | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
        {% endfor %}

        ---
    {% endif %}
  {% endunless %}
{% endfor %}


## 📌 Top-Level Standalone Pages

These pages are not part of a documentation collection but are accessible via a direct path.

| Title | URL Path |
| :--- | :--- |
{% assign standalones = site.html_pages | where_exp: "page", "page.collection == null and page.url != '/404.html'" | sort: 'title' %}
{% for page in standalones %}
  {% comment %} Exclude internal Jekyll files and the sitemap itself {% endcomment %}
  {% unless page.url contains '/monster-compendium/' or page.url contains '/help/site-map/' %}
    | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
  {% endunless %}
{% endfor %}