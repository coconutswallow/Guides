---
layout: doc
title: "Contents"
order: 1
background_image: 
---

![Player's Guide Cover]({{ '/assets/images/players-guide-cover.png' | relative_url }})

## Table of Contents

{% assign sorted_guides = site.playersguide | sort: 'order' %}

<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>