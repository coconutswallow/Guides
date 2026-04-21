---
layout: doc
title: "DM Resources"
order: 1
hide_from_nav: true
permalink: /dm-resources/
background_image: https://images.pexels.com/photos/3857508/pexels-photo-3857508.jpeg
---

This DM resource section contains helpful resources for DMs on the Hawthorne Guild server.  

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

<strong>Note:</strong> Some resources are external to the Hawthorne Guild and changes to those resources are outside of our control. If you find a broken link, please contact a member of the staff.

