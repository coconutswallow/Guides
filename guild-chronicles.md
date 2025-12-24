---
layout: doc
title: "Guild Chronicles"
description: "A chronological record of the Hawthorne Guild's history and major turning points."
toc: false
---

<div class="timeline">
  {% assign events = site.pages | where: "timeline_event", true | sort: "timeline_year" %}
  {% for event in events %}
    <div class="timeline-item">
      <div class="timeline-content">
        <span class="timeline-date">{{ event.timeline_year }} AE</span>
        <h3 class="timeline-title">
          <a href="{{ event.url | relative_url }}">{{ event.title }}</a>
        </h3>
        {% if event.description %}
        <p class="timeline-excerpt">{{ event.description }}</p>
        {% endif %}
      </div>
    </div>
  {% endfor %}
</div>