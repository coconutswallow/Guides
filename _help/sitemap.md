---
layout: doc
title: Site Map
order: 13
exclude_from_search: true
---

This page shows all content organized by collection and folder.

<table>
  <thead>
    <tr>
      <th>Collection/Folder</th>
      <th>Page Title</th>
      <th>Order</th>
      <th>URL</th>
    </tr>
  </thead>
  <tbody>
    {% comment %}
    Loop through all collections defined in config
    Exclude monsters collection
    {% endcomment %}
    
    {% assign sorted_collections = site.collections | sort: "label" %}
    {% for collection in sorted_collections %}
      {% if collection.label != "monsters" and collection.label != "posts" %}
        
        {% comment %}Get all documents in this collection{% endcomment %}
        {% assign docs = site[collection.label] | sort: "order" %}
        
        {% if docs.size > 0 %}
          {% for doc in docs %}
            <tr>
              <td><strong>{{ collection.label }}</strong></td>
              <td>{{ doc.title | default: doc.name }}</td>
              <td>{{ doc.order | default: "—" }}</td>
              <td><a href="{{ doc.url | relative_url }}">{{ doc.url }}</a></td>
            </tr>
          {% endfor %}
        {% endif %}
        
      {% endif %}
    {% endfor %}
    
    {% comment %}
    Also include regular pages (not in collections)
    {% endcomment %}
    {% assign regular_pages = site.pages | where_exp: "page", "page.url != '/404.html'" | sort: "title" %}
    {% for page in regular_pages %}
      {% unless page.url contains "/assets/" or page.url contains "/monster-compendium/" %}
        <tr>
          <td><strong>Pages</strong></td>
          <td>{{ page.title | default: page.name }}</td>
          <td>{{ page.order | default: "—" }}</td>
          <td><a href="{{ page.url | relative_url }}">{{ page.url }}</a></td>
        </tr>
      {% endunless %}
    {% endfor %}
    
  </tbody>
</table>

---

## Collections Summary

<ul>
{% for collection in sorted_collections %}
  {% if collection.label != "monsters" and collection.label != "posts" %}
    {% assign docs = site[collection.label] %}
    <li><strong>{{ collection.label }}</strong>: {{ docs.size }} pages</li>
  {% endif %}
{% endfor %}
</ul>