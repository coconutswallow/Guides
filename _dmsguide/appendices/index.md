---
layout: doc
title: "Contents"
order: 100
background_image: https://images.pexels.com/photos/3857508/pexels-photo-3857508.jpeg
permalink: /dmsguide/appendices/
hide_from_nav: true  
---

{% assign sorted_guides = site.dmsguide | where_exp: "item", "item.path contains '_dmsguide/appendices/'" | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>
