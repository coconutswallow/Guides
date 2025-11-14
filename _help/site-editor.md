---
title: Site Editor
layout: doc
order: 0
---
## Using the Web Editor to Edit documents

To make it easier for authors to add / edit documents, I installed a back-end web-editor onto the development site (coconutswallow.github.io/Guides).

> In the near term, we'll only stick to authors editing here first, so we can test and make sure nothing breaks, and then I'll sync updates to the Hawthorne production website on a regular basis. Once we've tested and feel comfortable with this, the long-term plan would be to kill the dev site and just make edits to the production site directly, but one step-at-a-time.

## Access to the Web Editor

To access the web editor, go to <https://coconutswallow.github.io/Guides/admin>

![Login Screen](/Guides/assets/images/CMS-1.png)

**Note:**  Only those who have been granted access can login. Request an invitation from **coconut** in Discord to get access.

## Main Screen

Once logged in, you should see the main screen that looks something like below.  The Collections on the left are the "books" or section of the website, and the center are the "pages" of the book.

![Main CMS Screen](/Guides/assets/images/CMS-2.png)

## Editing or adding a new page

To edit a new page, click on one of the pages to open it up for editing.  To add a new page, click on the button near the top right (in the example above, it's the \[New Player's Guide] button.

Once in, you'll see the header "Front Matter":

![Header Metadata](/Guides/assets/images/CMS-4.png)

The Front Matter section is very important, it's what the site uses to put the page onto the navigation menu.  Give the page a title.  the layout is always "doc" for your purposes, and the order dictates where it shows up on the navigation (so you might want to check what is the order before and after where you want to insert a page.  

Typically I've numbered pages 10, 20, 30 etc. so there's room to add pages in between without needing to update the page orders for every page in the section.

![Editor Block](/Guides/assets/images/CMS-5.png)

You'll see at the top, the menu bar that supports the formatting, along with a toggle for "rich text" and "markdown".  Editing using rich text allows you to not need to know/use markdown format, but you must use the formatting buttons above.  On the flip side, you can toggle to markdown.  Markdown is basically what Discord uses.  Of course, there is the option to toggle back-and-forth, which is what I am doing writing this because rich-text does have one big advantage:  **images**.

In rich-text format, you can press the + button in the bar, and choose image.  It will give you a couple of options, "Choose \[different] image", "Replace with URL", or "Remove image".

![](/Guides/assets/images/CMS-6.png)

Choose image allows you to select (or upload) images to the server, whereas "replace with url" allows you to add an external link

![](/Guides/assets/images/CMS-8.png)

As you can see in the screenshot above, you can select an image already uploaded, or press the upload image to add an image to the site library, then select it.

\## Publishing

Once you are done, hit the "Publish" button and it will load to the website in ~ 1-5 minutes.  

Again, in the short-term, it is only published to the development server, found at <https://coconutswallow.github.io/Guides>

Check how your page looks there, then ping **coconut** and ask him to check and sync the pages to the real site.  Once we've worked out the kinks, we'll skip this step and allow staff to update the site directly.[](https://coconutswallow.github.io/Guides)

[](https://coconutswallow.github.io/Guides)
