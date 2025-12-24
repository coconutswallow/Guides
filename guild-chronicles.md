---
layout: doc
title: "Guild Chronicles"
description: "A chronological record of the Hawthorne Guild's history and major turning points."
toc: false
---

<div class="timeline-container high-density">
  {% assign events = site.pages | where: "timeline_event", true | sort: "timeline_year" %}
  {% assign grouped_events = events | group_by: "timeline_year" %}

  {% for group in grouped_events %}
    <div class="timeline-year-block">
      <div class="timeline-year-marker">{{ group.name }} AE</div>
      
      <div class="timeline-events-list">
        {% for event in group.items %}
          <div class="timeline-item">
            <div class="timeline-content">
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
    </div>
  {% endfor %}
</div>