---
layout: doc
title: "Rules Contents"
order: 1
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
