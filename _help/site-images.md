---
layout: doc
title: "Site Images"
order: 52
---

## Home Page Images

On the main home-page, I created thumbnail images per "card".  You can see in index.html the format to add images, which I save to
`/assets/thumbnails.`  Note that for consistency, each image is 300x200px.  

## Background Images

You'll see for some pages, I have a background image.  The css to have the image in the background is built into the template, so
to add a background image, all you need to do is add `background_image: ` to the front matter, e.g.

```
---
layout: doc
title: "Downtime"
order: 15
background_image: /assets/images/tavern_brawl.jpg
---
```

## Adding images in pages

The syntax to add images inside regular documents unfortunately need a bit of a custom syntax:


<code>![Example of a Trade in #trade-logs]({{ '/assets/images/trade-example.png' | relative_url }})</code>



You need the `{{` in front of the URL and the `| relative_url }}` after the url for it to work.  But following this format
Makes it more maintainable, so that if we can have a development copy of this site with a different URL and we don't need to
fix the code when we migrate code from one site to the other


## Crediting Images

I add the source of the images in /resources/credit.md

