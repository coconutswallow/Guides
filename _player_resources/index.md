---
layout: doc
title: "Contents"
order: 1
hide_from_nav: true
permalink: /player-resources/
background_image: /assets/images/the_contract_by_exphrasis_dac13bh.jpg
---

![Player Resources Cover]({{ '/assets/thumbnails/hawthorne-map-300.jpg' | relative_url }})
<span class="image-caption">Hawthorne Guild: Player Resources & Helpful Links</span>

This documentation hub provides additional resources, downloads, and helpful links for players on the Hawthorne Guild server.

{% assign sorted_resources = site.player_resources | sort: 'order' %}
<ul>
  {% for res in sorted_resources %}
    {% if res.url != page.url %}
      <li>
        <a href="{{ res.url | relative_url }}">{{ res.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>

> [!NOTE]
> This section is currently under development. Useful community links and downloadable resources will be added here shortly.

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
