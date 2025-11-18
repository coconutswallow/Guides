---
layout: doc
title: "Contents"
order: 1
background_image: 
---

![Player's Guide Cover]({{ '/assets/images/players-guide-cover.png' | relative_url }})

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


> Image Credit
> [Tavern Brawl Image - Art by velinov](https://www.deviantart.com/velinov/art/Tavern-Brawl-96471746)
