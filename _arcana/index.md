---
layout: doc
title: "Contents"
order: 1
hide_from_nav: true
category: "Arcana"
background_image: "/assets/images/the_dungeon_master_by_moulinbleu_d61u428-fullview.jpg"
permalink: /arcana/
---

![Hawthorne Arcana Cover]({{ '/assets/thumbnails/arcana-300.png' | relative_url }})
<span class="image-caption">Hawthorne Arcana: Approved Homebrew Content</span>

Hawthorne Arcana is a curated collection of server legal homebrew, presenting new or revised character options for players as party of Allowed Content and amendments to existing sourcebooks to provide guidance to DMs and to fit within the server's setting.

The contents of Hawthorne Arcana are subject to change, to be noticed when a change is implemented. Both DMs and players should familiarize themselves with the contents present in this document

{% assign sorted_arcana = site.arcana | where_exp: "item", "item.hide_from_nav != true" | sort: 'order' %}
<ul>
  {% for doc in sorted_arcana %}
    <li>
      <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
    </li>
  {% endfor %}
</ul>

## Credit

This release has been created by Luolang using the Homebrewery in collaboration with Lore Consultants, Rules Architects, and Players of the Hawthorne Dungeons & Dragons Guild. Additional content and reference material obtained from Guildmaster's Guide to Ravnica.