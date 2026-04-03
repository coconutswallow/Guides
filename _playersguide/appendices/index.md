---
layout: doc
title: "Players Guide Appendices"
order: 1
background_image:
hide_from_nav: true  
---

{% assign sorted_guides = site.playersguide | where_exp: "item", "item.path contains '_playersguide/appendices/'" | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>
