---
layout: doc
title: "Guild Chronicles"
description: "A chronological record of the Hawthorne Guild's history."
toc: false
extra_css:
  - /assets/css/timeline.css
---

{% assign timeline = site.data.timeline | sort: "year" %}
{% assign grouped_events = timeline | group_by: "year" %}

<div class="chronicles-layout">

  <aside class="chronicles-sidebar">
    <div class="sticky-wrapper">
      <h4 class="nav-header">Years</h4>
      
      <button id="global-toggle" class="global-toggle-btn">
        <span class="icon">−</span> Hide Details
      </button>
      
      <nav class="year-nav">
        <ul>
          {% for group in grouped_events %}
            <li>
              <a href="#year-{{ group.name }}">{{ group.name }}</a>
            </li>
          {% endfor %}
        </ul>
      </nav>
    </div>
  </aside>

  <div class="chronicles-content">
    <div class="timeline-container">

      {% for group in grouped_events %}
        {% assign label = group.items[0].display_tag | default: group.name %}
        
        <div id="year-{{ group.name }}" class="timeline-year-group">
          
          <div class="timeline-year-marker">
            {{ label }}
            <span class="event-count">({{ group.items.size }})</span>
          </div>
          
          <div class="timeline-events-stack">
            {% for event in group.items %}
              
              {% assign is_full_entry = false %}
              {% if event.link %}
                {% unless event.link contains "discord.com" %}
                   {% assign is_full_entry = true %}
                {% endunless %}
              {% endif %}

              <div class="timeline-item">
                
                <div class="timeline-content {% if is_full_entry %}type-major{% endif %}">
                  
                  <div class="timeline-header-row">
                    {% if event.title %}
                      <h3 class="timeline-title">
                        {% if event.link %}
                          <a href="{{ event.link | relative_url }}">{{ event.title }}</a>
                        {% else %}
                          {{ event.title }}
                        {% endif %}
                      </h3>
                    {% endif %}
                    
                    <button class="card-toggle-btn" aria-label="Toggle description">
                      <span class="toggle-icon">▼</span>
                    </button>
                  </div>

                  <div class="timeline-body">
                    {{ event.content | markdownify }}
                  </div>

                  {% if is_full_entry %}
                    <div class="timeline-footer">
                      <a href="{{ event.link | relative_url }}" class="read-more">Read Full Entry &rarr;</a>
                    </div>
                  {% endif %}
                  
                </div>
              </div>
            {% endfor %}
          </div>
        </div>
      {% endfor %}
      
    </div>
  </div>
</div>

<script>
document.addEventListener("DOMContentLoaded", function() {
    // --- Scroll Spy Logic ---
    const navLinks = document.querySelectorAll('.year-nav a');
    const sections = document.querySelectorAll('.timeline-year-group');

    const observerOptions = {
        root: null,
        rootMargin: '-10% 0px -80% 0px', 
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove('active'));
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`.year-nav a[href="#${id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));

    // --- Toggle Logic ---

    // 1. Individual Card Toggles
    const cardButtons = document.querySelectorAll('.card-toggle-btn');
    
    cardButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // We toggle the class on the PARENT content wrapper
        // This allows CSS to handle padding/margins for the whole card
        const contentWrapper = this.closest('.timeline-content');
        contentWrapper.classList.toggle('collapsed-view');
      });
    });

    // 2. Global Toggle Sidebar
    const globalBtn = document.getElementById('global-toggle');
    const globalIcon = globalBtn.querySelector('.icon');
    let isGlobalCollapsed = false;

    globalBtn.addEventListener('click', function() {
      isGlobalCollapsed = !isGlobalCollapsed; // Toggle state
      const allContentWrappers = document.querySelectorAll('.timeline-content');

      if (isGlobalCollapsed) {
        // Collapse All
        globalBtn.innerHTML = '<span class="icon">+</span> Show Details';
        allContentWrappers.forEach(el => el.classList.add('collapsed-view'));
      } else {
        // Expand All
        globalBtn.innerHTML = '<span class="icon">−</span> Hide Details';
        allContentWrappers.forEach(el => el.classList.remove('collapsed-view'));
      }
    });
});
</script>