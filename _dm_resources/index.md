---
layout: doc
title: "Contents"
order: 1
hide_from_nav: true
permalink: /dm-resources/
background_image: /assets/images/the_contract_by_exphrasis_dac13bh.jpg
---

![DM Resources Cover]({{ '/assets/thumbnails/dmg-300.png' | relative_url }})
<span class="image-caption">Hawthorne Guild: DM Resources</span>

Welcome to the DM Resources hub. This section provides tools, templates, and additional documentation specifically for Dungeon Masters.

{% assign sorted_resources = site.dm_resources | sort: 'order' %}
<ul>
  {% for res in sorted_resources %}
    {% if res.url != page.url %}
      <li>
        <a href="{{ res.url | relative_url }}">{{ res.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>

