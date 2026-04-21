---
layout: doc
title: "Welcome to Hawthorne"
order: 1
permalink: /rules/
hide_from_nav: true 
background_image: 
---

Welcome to the Hawthorne Guild! We’re a D&D 5e community set in a persistent Forgotten Realms world, offering both one-shots and ongoing campaigns.

Please take a moment to review the server rules below, then jump in and join our vibrant community. The server is run by a dedicated team of **volunteer** staff members who work hard to create a fun, welcoming, and **inclusive space** for everyone. In return, we ask that you respect the rules and show patience with the staff as we support the community.

{% assign sorted_guides = site.rules | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>
