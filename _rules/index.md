---
layout: doc
title: "Contents"
order: 1
hide_from_nav: true 
background_image: 
---

{% assign sorted_guides = site.rules | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>
