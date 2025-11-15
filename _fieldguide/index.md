---
layout: doc
title: "Contents"
order: 1
background_image: 
---

![Adventure Locations](https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/6285bd6f-8c8b-4dd6-aaf9-8c057199b9a3/dk65v96-062e3ea1-2f95-46c6-af7c-f48e8fad6028.jpg/v1/fill/w_1192,h_670,q_70,strp/adventurerer_magicians_reviewing_the_world_by_tirinium1_dk65v96-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTA4MCIsInBhdGgiOiIvZi82Mjg1YmQ2Zi04YzhiLTRkZDYtYWFmOS04YzA1NzE5OWI5YTMvZGs2NXY5Ni0wNjJlM2VhMS0yZjk1LTQ2YzYtYWY3Yy1mNDhlOGZhZDYwMjguanBnIiwid2lkdGgiOiI8PTE5MjAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.adgmcTFp7X3TPYGgbU14U1xGyZhE8SoMlwBhVMRzPq4)

[*Image Credit - Art by Tirinium1*](https://www.deviantart.com/tirinium1/art/Adventurerer-Magicians-reviewing-the-world-1219675002)


{% assign sorted_guides = site.fieldguide | sort: 'order' %}
<ul>
  {% for doc in sorted_guides %}
    {% if doc.url != page.url %}
      <li>
        <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>

