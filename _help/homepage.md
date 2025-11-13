---
layout: doc
title: "Home Page"
order: 20
---

# Site Documentation: Editing the Homepage

This guide explains how to make simple edits to the main homepage (`index.html`) of the guild website.
Think of the `index.html` file as the **"lobby" or "front page"** of the entire website. 

It's designed with cards that link to the most commonly links, in a 3x3 format.  You can add more cards and rows, but I'd suggest
3x3 is a good size.  If there is something to be added, I'd suggest removing one of the existing card.  The side-nav has links to all content on the site - this is supposed to be the quick links.

## How the Homepage is Structured

The homepage is built in a very simple pattern:

1.  **Sections (`<div class="home-section">`)**: These are the big, full-width containers for a topic, like "For Players" or "For Dungeon Masters."

2.  **Cards (`<div class="feature-card">`)**: These are the individual "posters" or "flyers" inside each section that link to other pages.

Each "Card" is a self-contained block of code. All you need to do is find the card you want to edit and change the text inside it.

---

## How to Make Common Edits

The easiest way to edit this file is to find the text you want to change and replace it.

Let's look at one "feature-card" block as an example:

```html
<div class="feature-card">
  <h4>Player's Guide</h4>
  <img src="{{ '/assets/thumbnails/players-300.png' | relative_url }}" alt="Player's Guide" class="card-thumbnail">
  <p>Everything you need to know to create characters and play on the Hawthorne D&D 5e Server</p>
  <a href="{{ 'playersguide/index.html' | relative_url }}" class="card-button">Read Guide</a>
</div>
```

You can see in here:
`<h4></h4>`  is the title of the card

`<img src=`  and the contents between is the thumbnail. I'd just copy the format and replace the url.  note that for consistency,
all thumbnails are 300x200px

`<p></p>` is the text of the card

`<a href=` is where you put the link to the page the button goes to
