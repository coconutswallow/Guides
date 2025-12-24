---
layout: doc
title: "Guild Chronicles"
description: "A chronological record of the Hawthorne Guild's history and major turning points."
toc: false
---

<div class="timeline-container">
  {% assign events = site.pages | where: "timeline_event", true | sort: "timeline_year" %}
  {% assign grouped_events = events | group_by: "timeline_year" %}

  {% for group in grouped_events %}
    <details class="timeline-year-group">
      <summary>
        <div class="timeline-year-marker">
          {{ group.name }} AE 
          <span style="font-size: 0.8rem; margin-left: 10px; opacity: 0.8;">
            ({{ group.items.size }} Events)
          </span>
        </div>
      </summary>
      
      <div class="timeline-events-stack">
        {% for event in group.items %}
          <div class="timeline-item">
            <div class="timeline-content">
              <h3 class="timeline-title">
                <a href="{{ event.url | relative_url }}">{{ event.title }}</a>
              </h3>
              <p class="timeline-excerpt">{{ event.description }}</p>
            </div>
          </div>
        {% endfor %}
      </div>
    </details>
  {% endfor %}
</div>