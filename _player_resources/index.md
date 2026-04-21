---
layout: doc
title: "Player Resources"
order: 1
hide_from_nav: true
permalink: /player-resources/
background_image: /assets/images/the_contract_by_exphrasis_dac13bh.jpg
---

This player resource section contains helpful resources for players on the Hawthorne Guild server.  

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

<strong>Note:</strong> Some resources are external to the Hawthorne Guild and changes to those resources are outside of our control. If you find a broken link, please contact a member of the staff.