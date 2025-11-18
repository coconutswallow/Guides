---
layout: default
title: Site Map & Content Index
permalink: /help/site-map/
---

# Site Map & Content Index

This page lists all published collections and pages on the Hawthorne Guild site, providing an organized content index, including the `nav_order` where available.

{% comment %}
    Iterate over all defined collections in the site's configuration
{% endcomment %}
{% for collection in site.collections %}
  {% unless collection.label == 'posts' or collection.label == 'data' %}

    {% comment %}
        Header for the collection, linking to its base URL
    {% endcomment %}
    ## 📑 {{ collection.label | capitalize | replace: 'Dms_guide', "DM's Guide" | replace: 'Playersguide', "Player's Guide" }}

    {% comment %} Sort pages by the 'nav_order' variable in the front matter {% endcomment %}
    {% assign sorted_pages = collection.docs | sort: 'nav_order' %}

    | Order | Title | URL Path |
    | :--- | :--- | :--- |
    {% for page in sorted_pages %}
      {% comment %} 
        Display the order number. Default to a hyphen if nav_order is not set.
      {% endcomment %}
      {% assign order_display = page.nav_order | default: "-" %}

      | {{ order_display }} | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
    {% endfor %}

    ---
  {% endunless %}
{% endfor %}

{% comment %}
    Optionally, list top-level standalone pages like the FAQ
{% endcomment %}
## 📌 Standalone Pages

| Title | URL Path |
| :--- | :--- |
{% assign standalones = site.html_pages | where_exp: "page", "page.collection == null" | sort: 'title' %}
{% for page in standalones %}
  {% unless page.url contains '/help/' or page.url == '/404.html' or page.url == '/index.html' %}
    | [{{ page.title | default: page.slug | replace: '-', ' ' | capitalize }}]({{ page.url | relative_url }}) | `{{ page.url }}` |
  {% endunless %}
{% endfor %}