---
layout: doc
title: "Players Guide Appendices"
order: 89
background_image:
permalink: /playersguide/appendices/
hide_from_nav: true  
---

{% assign sorted_guides = site.playersguide | where_exp: "item", "item.path contains '_playersguide/appendices/'" | where_exp: "item", "item.hide_from_nav != true" | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    <li>
      <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
    </li>
  {% endfor %}
</ul>
