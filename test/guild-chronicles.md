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
      
      <button id="global-toggle" class="global-toggle-btn">Collapse All</button>
      
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
              
              {% comment %} 
                LOGIC: Detect full entry.
              {% endcomment %}
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

<style>
  /* Sidebar Toggle Button */
  .global-toggle-btn {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 5px 10px;
    margin-bottom: 15px;
    cursor: pointer;
    font-size: 0.85em;
    color: inherit;
  }
  .global-toggle-btn:hover {
    background-color: rgba(0,0,0,0.05);
  }

  /* Flexbox for Title + Button alignment */
  .timeline-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5em;
  }
  
  /* Ensure title takes up available space */
  .timeline-title {
    margin-bottom: 0 !important; /* Override default title margin */
    flex-grow: 1;
    padding-right: 10px;
  }

  /* Individual Card Toggle Button */
  .card-toggle-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 5px;
    font-size: 0.8em;
    opacity: 0.6;
    transition: transform 0.2s ease;
  }
  .card-toggle-btn:hover {
    opacity: 1;
  }

  /* Hidden State Logic */
  .timeline-body.is-hidden, 
  .timeline-footer.is-hidden {
    display: none;
  }
  
  /* Rotate icon when hidden */
  .card-toggle-btn.is-collapsed .toggle-icon {
    display: inline-block;
    transform: rotate(-90deg);
  }
</style>

<script>
document.addEventListener("DOMContentLoaded", function() {
    // --- Existing Scroll Spy Logic ---
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

                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    // --- New Toggle Logic ---

    // 1. Individual Card Toggles
    const cardButtons = document.querySelectorAll('.card-toggle-btn');
    
    cardButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Find the parent container
        const container = this.closest('.timeline-content');
        const body = container.querySelector('.timeline-body');
        const footer = container.querySelector('.timeline-footer'); // Also toggle footer if exists
        
        // Toggle visibility classes
        body.classList.toggle('is-hidden');
        if(footer) footer.classList.toggle('is-hidden');
        
        // Toggle icon rotation class
        this.classList.toggle('is-collapsed');
      });
    });

    // 2. Global Toggle Sidebar
    const globalBtn = document.getElementById('global-toggle');
    let isGlobalCollapsed = false;

    globalBtn.addEventListener('click', function() {
      isGlobalCollapsed = !isGlobalCollapsed; // Toggle state
      
      const allBodies = document.querySelectorAll('.timeline-body');
      const allFooters = document.querySelectorAll('.timeline-footer');
      const allCardBtns = document.querySelectorAll('.card-toggle-btn');

      if (isGlobalCollapsed) {
        // Collapse All
        globalBtn.textContent = "Expand All";
        
        allBodies.forEach(el => el.classList.add('is-hidden'));
        allFooters.forEach(el => el.classList.add('is-hidden'));
        allCardBtns.forEach(el => el.classList.add('is-collapsed'));
      } else {
        // Expand All
        globalBtn.textContent = "Collapse All";
        
        allBodies.forEach(el => el.classList.remove('is-hidden'));
        allFooters.forEach(el => el.classList.remove('is-hidden'));
        allCardBtns.forEach(el => el.classList.remove('is-collapsed'));
      }
    });
});
</script>