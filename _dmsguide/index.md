---
layout: doc
title: "Contents"
order: 1
hide_from_nav: true
background_image: https://images.pexels.com/photos/3857508/pexels-photo-3857508.jpeg  
---

![Dungeon Master's Guide Cover](https://images.squarespace-cdn.com/content/v1/592dff77e6f2e11e077a7dd4/1497302429671-X4WO248YRRWZGEYBZ5U2/image-asset.jpeg)
<span class="image-caption"><a href="https://www.toddlockwood.com/dungeons-and-dragons#/tsr-jam/">Art by Wizards of the Coast (TSR Jam)</a></span>


Welcome Dungeon Masters! This document provides all of the information and rules you’ll need to know for DMing on the Hawthorne Guild 5th edition D&D server.

{% assign sorted_guides = site.dmsguide | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>
