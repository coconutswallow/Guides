---
layout: doc
title: "Contents"
order: 1
hide_from_nav: true 
permalink: /resources/
background_image: 
---

{% assign sorted_resources = site.resources | where_exp: "item", "item.hide_from_nav != true" | sort: 'order' %}
<ul>
  {% for res in sorted_resources %}
    <li>
      <a href="{{ res.url | relative_url }}">{{ res.title }}</a>
    </li>
  {% endfor %}
</ul>
