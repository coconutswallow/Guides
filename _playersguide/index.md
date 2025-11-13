---
layout: doc
title: "Contents"
order: 1
background_image: 
---

<div class="toc-container">

  <div class="toc-image" markdown="1">
    ![Player's Guide Cover]({{ '/assets/images/players-guide-cover.png' | relative_url }})
  </div>
  
  <div class="toc-links" markdown="1">
    ## Table of Contents

    {% assign sorted_guides = site.playersguide | sort: 'order' %}

    <ul>
      {% for doc in sorted_guides %}
        {% if doc.url != page.url %}
          <li>
            <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
          </li>
        {% endif %}
      {% endfor %}
    </ul>
  </div>

</div>