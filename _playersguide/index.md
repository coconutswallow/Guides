---
layout: doc
title: "Contents"
order: 1
background_image:
hide_from_nav: true  
---

![Player's Guide Cover]({{ '/assets/images/players-guide-cover.png' | relative_url }})
<span class="image-caption"><a href="https://www.deviantart.com/velinov/art/Tavern-Brawl-96471746">Tavern Brawl - Art by Velinov</a></span>

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
