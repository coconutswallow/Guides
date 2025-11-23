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

Internal Images (saved onto the site):
```
![Example of a Trade in #trade-logs](Guides/assets/images/trade-example.png)
```

External Images:
```
![Example of a Trade in #trade-logs](https://image.com/example-image.png)
```

## Crediting Images

To credit an image, we need to use an html tag (span class="image caption"):

```
<span class="image-caption">Dragon Magazine #300</span>
```

You can also insert links to the caption, but require the HTML tag instead of markdown:
```
<span class="image-caption"><a href="https://cdnb.artstation.com/p/assets/images/images/021/394/125/4k/logan-feliciano-bonespire-002s.jpg?1571510286">Bone Spire by logan-feliciano</a></span>
```

