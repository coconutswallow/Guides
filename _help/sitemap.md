---
layout: default
title: Site Map & Content Index
order: 21
permalink: /help/site-map/
---

# 🗺️ Site Map & Content Index

This index lists all documentation pages categorized by their collection, including the defined page order (`nav_order`).

---

{% comment %}
    Iterate over all defined collections in the site's configuration
{% endcomment %}
{% for collection in site.collections %}
  {% unless collection.label == 'posts' or collection.label == 'data' or collection.label == 'monsters' %}
    
    {% comment %} Sort pages by the 'nav_order' variable in the front matter. {% endcomment %}
    {% assign collection_pages = collection.docs | where_exp: "page", "page.layout == 'doc' or page.layout == 'default'" %}
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


## 📌 Standalone Pages (FAQ, Home, Help)

These are pages that do not belong to a dedicated documentation collection.

| Title | URL Path |
| :--- | :--- |
{% assign standalones = site.html_pages | where_exp: "page", "page.collection == null and page.layout == 'default'" | sort: 'title' %}
{% for page in standalones %}
  {% comment %} Exclude internal Jekyll files and the sitemap itself {% endcomment %}
  {% unless page.url contains '/404.html' or page.url contains '/monster-compendium/' or page.url contains '/help/site-map/' %}
    | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
  {% endunless %}
{% endfor %}