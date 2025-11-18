---
title: Site Images
layout: doc
order: 52
exclude_from_search: true
---
## Home Page Images

On the main home-page, I created thumbnail images per "card".  You can see in index.html the format to add images, which I save to
`/assets/thumbnails.`  Note that for consistency, each image is 300x200px.  

## Background Images

You'll see for some pages, I have a background image.  The css to have the image in the background is built into the template, so
to add a background image, all you need to do is add `background_image:` to the front matter, e.g.

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

```
![Example of a Trade in #trade-logs]({{ '/assets/images/trade-example.png' | relative_url }})
```

Or...

add Guides in front...

```
![Example of a Trade in #trade-logs]('Guides/assets/images/trade-example.png')
```


## Crediting Images

I add the source of the images in /resources/credit.md or at the bottom of the page itself (e.g. Adventure Locations).

